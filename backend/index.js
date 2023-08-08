import { request as httpRequest } from 'node:https';
import express from 'express';
import bparser from 'body-parser';
import { Validator as JValidator } from 'jsonschema';
import * as fs from 'node:fs';
import { stringify as queryString } from 'node:querystring';

const app = express();
const jbodyparser = bparser.json();
const jvalid = new JValidator();
jvalid.addSchema({
	type: 'object',
	properties: {
		uid: {
			type: 'integer',
			minimum: -1,
			required: true
		},
		ids: {
			type: 'array',
			required: true,
			items: {
				type: 'string',
				pattern: '^[A-Z]{4}[0-9]{5}$',
				minLength: 9,
				maxLength: 9
			}
		},
		regions: {
			type: 'array',
			required: true,
			items: {
				type: 'number',
				minimum: 0,
				maximum: 3
			}
		},
		title: {
			type: 'string',
			required: true,
			pattern: '^[A-Za-z0-9\x20-\x3C\x3F\x40]+$'
		},
		updated: {
			type: 'integer',
			required: true,
			minimum: 0
		},
		type: {
			type: 'integer',
			required: true,
			minimum: 0,
			maximum: 2
		},
		distr: {
			type: 'integer',
			required: true,
			minimum: 0,
			maximum: 2
		},
		status: {
			type: 'integer',
			required: true,
			minimum: 0,
			maximum: 4
		},
		comment: {
			type: 'string',
			required: true,
			maxLength: 1024,
			not: {id: '[detected HTML code]', pattern: '<[^>]*>'}
		},
		rpcsx: {
			type: 'string',
			required: true,
			minLength: 7,
			maxLength: 40,
			pattern: '^[0-9A-Fa-f]+$'
		},
	}
}, '/DBEntry');

const dbschema = {
	type: 'array',
	items: {$ref: '/DBEntry'},
	properties: {
		uniqueItems: true
	}
};

const openJSON = (path, def) =>
	fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, {encoding: 'utf8', flag: 'r'})) : def;

const openDB = path => {
	const jdata = openJSON(path, []);
	const res = jvalid.validate(jdata, dbschema);
	if (!res.valid) throw new Error(res.errors[0].toString());
	return jdata;
};

const cfg = openJSON('../cfg.json', {
	reCAPTCHA_enabled: false,
	reCAPTCHA_secret: '',
	reCAPTCHA_site: ''
});
const db = openDB('../db.json');
const maxItemsPerPage = 20;
const overall = [];
let latestUID = -1;

const getGameByID = id => {
	if (id < 0) return null;

	for (let i = 0; i < db.length; ++i) {
		if (db[i].uid === id)
			return db[i];
	}

	return null;
};

const updateDB = () => {
	for (let i = 0; i < 5; ++i) overall[i] = 0;

	db.forEach(item => {
		++overall[item.status];
		latestUID = Math.max(latestUID, item.uid);
	});

	db.sort((a, b) => b.status - a.status);
};

const saveDB = (path) => {
	fs.writeFileSync(path, JSON.stringify(db));
};

app.use('/assets', express.static('../assets/'));
app.use('/', express.static('../frontend/'));

app.get('/api/find/:code', (req, res) => {
	res.setHeader('content-type', 'application/json');

	const {code} = req.params;

	for (let i = 0; i < db.length; ++i) {
		const ids = db[i].ids;
		if (ids.findIndex(id => id === code) !== -1) {
			res.send(JSON.stringify({success: true, game: db[i]}));
			return;
		}
	}

	res.send('{"success": false, "message": "No game found"}');
});

app.get('/api/game/:uid', (req, res) => {
	res.setHeader('content-type', 'application/json');

	const uid = parseInt(req.params.uid);
	if (uid >= 0) {
		const game = getGameByID(uid);
		if (game !== null) {
			res.send(JSON.stringify({success: true, game: game}));
			return;
		}
	}

	res.send('{"success": false, "message": "No game found"}');
});

const compareArrays = (a, b) =>
	a.length === b.length &&
	a.every((el, idx) => el === b[idx]);

const isSomethingChanged = game => {
	if (game.uid < 0) return true;
	const ogame = getGameByID(game.uid);

	return game.title !== ogame.title ||
		   game.type !== ogame.type ||
		   game.distr !== ogame.distr ||
		   game.status !== ogame.status ||
		   game.comment !== ogame.comment ||
		   game.rpcsx !== ogame.rpcsx ||
		   !compareArrays(game.regions, ogame.regions) ||
		   !compareArrays(game.ids, ogame.ids);
};

app.get('/api/ckey', (req, res) => {
	res.setHeader('content-type', 'application/json');
	const jres = {enabled: cfg.reCAPTCHA_enabled};
	if (jres.enabled) jres.key = cfg.reCAPTCHA_site;
	res.send(JSON.stringify(jres));
});

const suggestGameInfo = async (game, robj, ip) => {
	const result = jvalid.validate(game, {$ref: '/DBEntry'});
	if (result.valid === true) {
		if (!isSomethingChanged(game)) {
			robj.success = false;
			robj.message = 'Nothing changed! Your suggestion was rejected.';
		} else {
			const fname = `us-${Buffer.from(ip).toString('base64')}-${Date.now()}.json`;
			try {
				fs.writeFileSync(fname, JSON.stringify(game));

				robj.success = true;
				robj.message = 'Suggestion submitted, thank you!';
			} catch (err) {
				console.error(err);
				robj.success = false;
				robj.message = 'I/O error on the server side.'
			}
		}
	} else {
		robj.success = false;
		robj.message = result.errors[0].toString();
	}
};

app.set('trust proxy', false);

app.put('/api/db', jbodyparser, async (req, res) => {
	res.setHeader('content-type', 'application/json');
	const robj = {success: false, message: ''};
	const body = req.body;

	if (cfg.reCAPTCHA_enabled === false) {
		suggestGameInfo(body.game, robj, req.ip);
		return;
	}

	const gpostData = queryString({secret: cfg.reCAPTCHA_secret, response: body.token});
	const greq = httpRequest({
		hostname: 'www.google.com',
		port: 443,
		method: 'POST',
		path: '/recaptcha/api/siteverify',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': gpostData.length
		}
	}, gres => {
		const data = [];

		gres.on('data', d => {
			data.push(d);
		});

		gres.on('end', () => {
			const grbody = JSON.parse(Buffer.concat(data));
			if (grbody.success) {
				suggestGameInfo(body.game, robj, req.ip);
			} else {
				robj.success = false;
				robj.message = 'reCAPTCHA test failed';
			}
		});
	});

	greq.on('error', e => {
		robj.success = false;
		robj.message = e.message;
	});

	greq.on('close', () => {
		res.send(JSON.stringify(robj));
	});

	greq.write(gpostData);
	greq.end();
});

app.get('/api/db/:page', (req, res) => {
	res.setHeader('content-type', 'application/json');

	const pagen = parseInt(req.params.page);
	const {filter, starts, bstat} = req.query;
	const bstati = parseInt(bstat ?? 0xFFFFFFFF);

	if (pagen > 0) {
		const dbsize = db.length;
		const start = (pagen - 1) * maxItemsPerPage;
		const end = Math.min(dbsize, start + maxItemsPerPage);

		res.write(`{"success": true, "overall": [${overall.join(', ')}], `);
		if ((filter == null || filter === '') && (starts == null || starts === '') && (bstati == null || bstati === 0)) {
			res.write(`"pages": ${Math.ceil(dbsize / maxItemsPerPage)}, "items": [`);
			for (let i = start; i < end; ++i) {
				if (i > start) res.write(', ');
				res.write(JSON.stringify(db[i]));
			}
			res.end(']}');
		} else {
			let found = 0;
			const ufilter = filter ? filter.toUpperCase() : null;
			let ustarts = null;
			const items = [];

			switch (starts) {
				case undefined:
				case '':
					ustarts = null;
					break;
				case 'sym':
					ustarts = /^[\x21-\x3C\x3F\x40]/;
					break;
				case 'num':
					ustarts = /^[0-9]/;
					break;
				default:
					ustarts = new RegExp(`^\\x${starts.charCodeAt(0).toString(16)}`);
					break;
			}

			for (let i = 0; i < db.length; ++i) {
				const utitle = db[i].title.toUpperCase();
				if (
					((bstati & (1 << db[i].status)) > 0) &&
					(ustarts ? ustarts.test(utitle) : true) &&
					(ufilter ? utitle.indexOf(ufilter) !== -1 || db[i].ids.findIndex(id => id.indexOf(ufilter) !== -1) !== -1 : true)
				) {
					if (found++ < start || items.length >= maxItemsPerPage) continue;
					items.push(JSON.stringify(db[i]));
				}
			}

			res.end(`"pages": ${Math.ceil(found / maxItemsPerPage)}, "items": [${items.join(', ')}]}`);
		}
		return;
	}

	res.send('{"success": false, "message": "Page number must be a integer value that is greater than 0"}');
});

updateDB();
app.listen(8081, () => console.log(`Server started on http://127.0.0.1:8081/`));
