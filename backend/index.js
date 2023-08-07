const express = require('express');
const jbodyparser = require('body-parser').json();
const JValidator = require('jsonschema').Validator;
const fs = require('fs');
const app = express();

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

const openDB = path => {
	if (!fs.existsSync(path)) return [];
	const jdata = JSON.parse(fs.readFileSync(path, {encoding: 'utf8', flag: 'r'}));
	const res = jvalid.validate(jdata, dbschema);
	if (!res.valid) throw new Error(res.errors[0].toString());
	return jdata;
};

const db = openDB('./db.json');
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

app.use('/', express.static('../frontend/'));

app.get('/find/:code', (req, res) => {
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

app.get('/game/:uid', (req, res) => {
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

app.put('/db', jbodyparser, (req, res) => {
	res.setHeader('content-type', 'application/json');
	const game = req.body;
	const result = jvalid.validate(game, {$ref: '/DBEntry'});
	const resp = {success: true, message: ''};

	if (result.valid === true) {
		if (!isSomethingChanged(game)) {
			resp.success = false;
			resp.message = 'Nothing changed! Your suggestion was rejected.';
		} else {
			// TODO: Save it
			console.log(game);
			resp.message = 'Suggestion submitted, thank you!';
		}
	} else {
		resp.success = false;
		resp.message = result.errors[0].toString();
	}

	res.send(JSON.stringify(resp));
});

app.get('/db/:page', (req, res) => {
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
