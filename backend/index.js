const express = require('express');
const fs = require('fs');
const app = express();
const db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', {encoding: 'utf8', flag: 'r'})) : [];
const maxItemsPerPage = 20;
const overall = [];

const updateOverall = () => {
	for (let i = 0; i < 5; ++i) overall[i] = 0;

	db.forEach(item => {
		++overall[item.status];
	});
};

require('express-ws')(app);
app.use('/', express.static('../frontend/'));

app.get('/db/:page', (req, res) => {
	res.setHeader('content-type', 'application/json');

	const pagen = parseInt(req.params.page);
	const filter = req.query.filter;
	const starts = req.query.starts;

	if (pagen > 0) {
		const dbsize = db.length;
		const start = (pagen - 1) * maxItemsPerPage;
		const end = Math.min(dbsize, start + maxItemsPerPage);

		res.write(`{"success": true, "overall": [${overall.join(', ')}], `);
		if ((filter == null || filter === '') && (starts == null || starts === '')) {
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
				case '':
					ustarts = null;
					break;
				case 'sym':
					ustarts = /^[\.\#]/;
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
				if ((ustarts ? ustarts.test(utitle) : true) && (ufilter ? utitle.indexOf(ufilter) !== -1 || db[i].ids.findIndex(id => id.indexOf(ufilter) !== -1) !== -1 : true)) {
					if (found++ < start || items.length >= maxItemsPerPage) continue;
					items.push(JSON.stringify(db[i]));
				}
			}

			res.end(`"pages": ${Math.ceil(found / maxItemsPerPage)}, "items": [${items.join(', ')}]}`);
		}
		return;
	}

	res.send('{"success": false, "error": "Page number must be a integer value that is greater than 0"}')
});

updateOverall();
app.listen(8081, () => console.log(`Server started on http://127.0.0.1:8081/`));
