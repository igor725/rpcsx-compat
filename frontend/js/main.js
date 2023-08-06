window.addEventListener('load', () => {
	const $ = qs => document.querySelector(qs); // Why not?
	const $$ = qs => document.querySelectorAll(qs);

	const dburl = '/db/';
	const info = {
		statuses: ['Nothing', 'Loadable', 'Intro', 'Ingame', 'Playable'],
		expls: [
			'Games that don\'t initialize properly, not loading at all and/or crashing the emulator',
			'Games that display a black screen',
			'Games that display image but don\'t make it past the menus',
			'Games that either can\'t be finished, have serious glitches or have insufficient performance',
			'Games that can be completed with playable performance and no game breaking glitches'
		],
		colors: ['#455556', '#e74c3c', '#e08a1e', '#f9b22f', '#1ebc61'],
		types: ['Multiplatform', 'PlayStation™ exclusive', 'Console exclusive'],
		distribs: ['DIGIT', 'DISK'],
		regions: ['USA', 'EUR', 'JPN']
	};

	const getHashParamInt = (param) => {
		const params = new URLSearchParams(location.hash.substring(1));
		return parseInt(params.get(param) ?? 0);
	};

	const setHashParam = (param, value) => {
		const params = new URLSearchParams(location.hash.substring(1));
		params.set(param, value);
		location.hash = params.toString();
	};

	const updateTable = () => {
		const params = new URLSearchParams(location.hash.substring(1));
		const cpage = parseInt(params.get('p') ?? '1');
		const ibstat = parseInt(params.get('b') ?? '0');
		const filter = params.get('f');
		const starts = params.get('s');
		const query = [];

		if (filter !== null) query.push(`filter=${encodeURIComponent(filter)}`);
		if (starts !== null) query.push(`starts=${encodeURIComponent(starts)}`);
		if (ibstat !== 0) query.push(`bstat=${ibstat}`);

		const xhr = new XMLHttpRequest();
		xhr.responseType = 'json';
		xhr.onerror = () => {
			$('table.compat-table tbody').innerHTML = '<tr><td style="text-align: center;" colspan=4>Server request failed. Please, try refreshing the page in 5 minutes.</td></tr>';
			$('div.compat-pages').innerHTML = '';
		};
		xhr.onload = () => {
			const res = xhr.response;
			if (typeof res === 'object' && !Array.isArray(res)) {
				if (res.success === true) {
					const items = res.items;
					const pages = res.pages;
					if (pages > 0 && cpage > pages) {
						setHashParam('p', pages);
						return;
					}
					const overall = res.overall;
					const max = overall.reduce((a, b) => a + b, 0);

					const htoverall = [];

					for (let i = overall.length - 1; i >= 0; --i) {
						htoverall.push(`
							<div class="compat-status-line">
								<input type="checkbox" value="${1 << i}"${(ibstat & (1 << i)) > 0 ? ' checked' : ''}/>
								<strong style="color: ${info.colors[i]}">${info.statuses[i]} (${((overall[i] / max) * 100).toFixed(2)}%)</strong>:
								${info.expls[i]}
							</div>
						`);
					}

					$('div.compat-status').innerHTML = htoverall.join('');

					const ht_items = [];

					for (let i = 0; i < items.length; ++i) {
						const item = items[i];
						const ids = item.ids;
						const regions = item.regions;
						const lr = i === (items.length - 1) ? ' last-row' : '';
						const hids = [];

						for (let j = 0; j < ids.length; j++) {
							hids.push(`<div class="compat-serial" data-id=${ids[j]}>
								<img src="/assets/${info.regions[regions[j]]}.png"/>
								<a href="javascript:void(0);">${ids[j]}</a>
							</div>`);
						}

						ht_items.push(`
							<div class="compat-trow${lr}" data-id="${item.uid}">
								<div class="compat-tcell first">${hids.join('<br>')}</div>
								<div class="compat-tcell">
									<img class="compat-distr" src="/assets/${info.distribs[item.distr]}.png"/>
									<span class="game-title">${item.title}</span>
								</div>
								<div class="compat-tcell" style="color: ${info.colors[item.status]}">${info.statuses[item.status]}</div>
								<div class="compat-tcell">${(new Date(item.updated).toLocaleDateString())}</div>
							</div>
							<div class="compat-trow game-extrainfo${lr}">
								<div class="compat-tcell first">
									Game type: ${info.types[item.type]}<br/>
									Tested on: <a href="https://github.com/RPCSX/rpcsx/commit/${item.rpcsx}" target="_blank">${item.rpcsx}</a><br/>
									${item.comment !== '' ? 'Comment: ' + item.comment : ''}
								</div>
							</div>
						`);
					}
					$('div.compat-table .compat-tbody').innerHTML = ht_items.join('');

					if (pages < 2) {
						// Only one page available atm
						$('div.compat-pages').innerHTML = '';
					} else {
						const left = Math.max(1, cpage - 5);
						const right = Math.min(pages, cpage + 5);
						const htpages = [];

						for (let i = left; i <= right; ++i) {
							htpages.push(`<a draggable="false" href="javascript:void(0);" ${i === cpage ? 'class="current"' : ''}>${i}</a>`);
						}

						$('div.compat-pages').innerHTML = htpages.join('');
					}

					return;
				}

				alert(`Error returned by server: ${res.error}`);
				return;
			}

			alert('Failed to parse received response from server');
		};

		xhr.open('get', dburl + cpage + (query.length > 0 ? '?' + query.join('&') : ''));
		xhr.send();
	};

	const getNextRowAfter = (row) => {
		do {
			row = row.nextElementSibling ?? row.nextSibling;
			if (row === null) break;
		} while (row.nodeType !== Node.ELEMENT_NODE || row.classList.contains('.compat-trow'));

		return row;
	};

	const closeInfo = info => {
		if (info === null) return;
		info.classList.remove('open');
		info.classList.add('close');
		setTimeout(() => info.classList.remove('close'), 255);
	};

	$('div.compat-table .compat-tbody').addEventListener('click', ev => {
		const pnode = ev.target.parentNode;
		if (pnode.classList.contains('compat-serial')) {
			const a = document.createElement('a');
			const code = pnode.dataset.id.match(/^([A-Z]+)([0-9]+)/);
			a.href = `https://serialstation.com/titles/${code[1]}/${code[2]}`;
			a.target = '_blank';
			a.click();
			a.remove();
			return;
		}
		const target = ev.target.classList.contains('.compat-trow') ? ev.target : ev.target.closest('div.compat-trow');
		if (target.classList.contains('game-extrainfo')) return;
		const info = getNextRowAfter(target);
		if (info === null) return;

		if (target.classList.toggle('game-expanded')) {
			$$('.compat-trow.game-expanded').forEach(elem => {
				if (elem !== target) {
					elem.classList.remove('game-expanded');
					closeInfo(getNextRowAfter(elem));
				}
			});
			info.classList.add('open');
			info.classList.remove('close');
		} else {
			closeInfo(info);
		}
	});

	const htstitms = [];

	htstitms.push(`<div class="item" data-value=""><span>All</span></div>`);
	htstitms.push(`<div class="item" data-value="num"><span>0-9</span></div>`);
	for (let i = 65; i < 91; ++i)
		htstitms.push(`<div class="item" data-value="${String.fromCharCode(i)}"><span>${String.fromCharCode(i)}</span></div>`);
	htstitms.push(`<div class="item" data-value="sym"><span>#</span></div>`);

	$('div.compat-starts').innerHTML = htstitms.join('');

	let inpupd = null;
	$('div.compat-search input').addEventListener('input', ev => {
		if (inpupd !== null) clearTimeout(inpupd);
		inpupd = setTimeout(() => {
			setHashParam('f', ev.target.value);
			inpupd = null;
		}, 1000);
	});

	$('div.compat-starts').addEventListener('click', ev => {
		setHashParam('s', ev.target.dataset.value ?? '');
	});

	$('div.compat-status').addEventListener('click', ev => {
		const target = ev.target;
		if (target.tagName !== 'INPUT') return;
		const curr = getHashParamInt('b');
		const bit = parseInt(target.value);
		setHashParam('b', target.checked ? curr | bit : curr & ~bit);
	});

	$('div.compat-pages').addEventListener('click', ev => {
		if (ev.target.tagName !== 'A') return;
		setHashParam('p', ev.target.innerText);
	});

	window.addEventListener('hashchange', updateTable);
	updateTable();
});
