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
			minimum: 0
		},
		ids: {
			type: 'array',
			items: {type: 'string'}
		},
		regions: {
			type: 'array',
			items: {type: 'number'}
		},
		title: {
			type: 'string',
			pattern: '^[A-Za-z0-9\.,\/#\!\$%\^&\*;:{}=\-_`~\(\)\"\' ]+$'
		},
		updated: {
			type: 'integer',
			minimum: 0
		},
		type: {
			type: 'integer',
			minimum: 0,
			maximum: 2
		},
		distr: {
			type: 'integer',
			minimum: 0,
			maximum: 1
		},
		status: {
			type: 'integer',
			minimum: 0,
			maximum: 4
		},
		comment: {
			type: 'string',
			maxLength: 1024
		},
		rpcsx: {
			type: 'string',
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

const getGameByID = id => {
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
	});

	db.sort((a, b) => b.status - a.status);
};

const saveDB = (path) => {
	fs.writeFileSync(path, JSON.stringify(db));
};

app.use('/', express.static('../frontend/'));

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

app.put('/db', jbodyparser, (req, res) => {
	res.setHeader('content-type', 'application/json');
	console.log(req.body);
	const result = jvalid.validate(req.body, {$ref: '/DBEntry'});
	res.write(`{"success": ${result.valid}, "message": "`);
	if (result.valid === true) {
		res.write('Suggestion submitted, thank you!');
		// TODO: Save it
	} else
		res.write(result.errors[0].toString().replace('\\', '\\\\').replace('"', '\\"'));
	res.end('"}');
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
					ustarts = /^[\.,\/#\!\$%\^&\*;:{}=\-_`~()]/;
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

	res.send('{"success": false, "message": "Page number must be a integer value that is greater than 0"}')
});

updateDB();
app.listen(8081, () => console.log(`Server started on http://127.0.0.1:8081/`));
