import { open as openWindow } from './wloader.js';
import { Request } from './request.js';

export let reCAPTCHA_sitekey = 'NOTSET';

export const makeItShake = target => {
	target.classList.add('shake');
	setTimeout(() => target.classList.remove('shake'), 255);
}

window.on('load', () => {
	const info = {
		statuses: ['Nothing', 'Loadable', 'Intro', 'Ingame', 'Playable'],
		expls: [
			'Games that don\'t initialize properly, not loading at all and/or crashing the emulator',
			'Games that display a black screen',
			'Games that display image but don\'t make it past the menus',
			'Games that either can\'t be finished, have serious glitches or have insufficient performance',
			'Games that can be completed with playable performance and no game breaking glitches'
		],
		colors: ['#e74c3c', '#fa6800', '#e08a1e', '#f9b22f', '#1ebc61'],
		types: ['Multiplatform', 'PlayStation™ exclusive', 'Console exclusive'],
		distribs: ['DIGIT', 'DISK', 'HBREW'],
		regions: ['WOR', 'USA', 'EUR', 'JPN']
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

		const url = '/api/db/' + cpage + (query.length > 0 ? '?' + query.join('&') : '');
		(new Request(url)).callback((status, body) => {
			if (!Request.success(status)) {
				$('div.compat-tbody').innerHTML = '<div class="compat-trow reset"><div class="compat-tcell spanned">Server request failed. Please, try refreshing the page in 5 minutes.</div></div>';
				$('div.compat-pages').innerHTML = '';
				return;
			}

			if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
				if (body.success === true) {
					const items = body.items;
					const pages = body.pages;
					if (pages > 0 && cpage > pages) {
						setHashParam('p', pages);
						return;
					}

					const overall = body.overall;
					const max = overall.reduce((a, b) => a + b, 0);
					const htoverall = [];

					for (let i = overall.length - 1; i >= 0; --i) {
						htoverall.push(`
							<div class="compat-status-line">
								<div class="status-title">
									<input type="checkbox" value="${1 << i}"${(ibstat & (1 << i)) > 0 ? ' checked' : ''}/>
									<strong style="color: ${info.colors[i]}">${info.statuses[i]} (${((overall[i] / max) * 100).toFixed(2)}%)</strong>:
								</div>
								<div class="scrollable-text">${info.expls[i]}</div>
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
							<div class="compat-trow extrainfo${lr}">
								<div class="compat-tcell first">
									Game type: ${info.types[item.type]}<br/>
									Tested on: <a href="https://github.com/RPCSX/rpcsx/commit/${item.rpcsx}" target="_blank">${item.rpcsx}</a>
									${item.comment !== '' ? '<br>Comment: ' + item.comment.replace('<[^>]*>', '') : ''}<br>
									<a class="compat-edit-this" data-id="${ids[0]}" href="javascript:void(0);">Edit this game</a>
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

				alert(`Error returned by server: ${body.message}`);
				return;
			}

			alert('Failed to parse received response from server');
		}).perform();
	};

	const getNextRowAfter = (row) => {
		do {
			row = row.nextElementSibling;
			if (row === null) break;
		} while (row.classList.contains('.compat-trow'));

		return row;
	};

	const closeInfo = info => {
		if (info === null) return;
		info.classList.remove('open');
		info.classList.add('close');
		setTimeout(() => info.classList.remove('close'), 255);
	};

	$('div.compat-table .compat-tbody').on('click', ({target}) => {
		const pnode = target.parentNode;
		if (pnode.classList.contains('compat-serial')) {
			const a = document.createElement('a');
			const code = pnode.dataset.id.match(/^([A-Z]+)([0-9]+)/);
			a.href = `https://serialstation.com/titles/${code[1]}/${code[2]}`;
			a.target = '_blank';
			a.click();
			a.remove();
			return;
		} else if (target.classList.contains('compat-edit-this')) {
			openWindow('editor', target.dataset.id);
			return;
		}

		const tnode = target.classList.contains('.compat-trow') ? target : target.closest('div.compat-trow');

		if (tnode.classList.contains('extrainfo')) {
			return;
		} else if (tnode.classList.contains('reset')) {
			updateTable();
			return;
		}

		const info = getNextRowAfter(tnode);
		if (info === null) return;

		if (tnode.classList.toggle('expanded')) {
			$$('.compat-trow.expanded').forEach(elem => {
				if (elem !== tnode) {
					elem.classList.remove('expanded');
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

	const stitcl = (val, tit = null) =>
		`<div class="item in-center" data-value="${val}"><span>${tit ?? val}</span></div>`;

	htstitms.push(stitcl('', 'All'));
	htstitms.push(stitcl('num', '0-9'));

	for (let i = 65; i < 91; ++i)
		htstitms.push(stitcl(String.fromCharCode(i)));
	htstitms.push(stitcl('sym', '#'));

	$('div.compat-starts').innerHTML = htstitms.join('');

	let inpupd = null;
	$('div.compat-search input').on('input', ev => {
		if (inpupd !== null) clearTimeout(inpupd);
		inpupd = setTimeout(() => {
			setHashParam('f', ev.target.value);
			inpupd = null;
		}, 1000);
	});

	$('div.compat-starts').on('click', ({target}) => {
		setHashParam('s', target.dataset.value ?? '');
	});

	$('div.compat-status').on('click', ({target}) => {
		if (target.tagName !== 'INPUT') return;
		const curr = getHashParamInt('b');
		const bit = parseInt(target.value);
		setHashParam('b', target.checked ? curr | bit : curr & ~bit);
	});

	$('div.compat-pages').on('click', ({target}) => {
		if (target.tagName !== 'A') return;
		setHashParam('p', target.innerText);
	});

	$('div.compat-rbuttons').on('click', ({target}) => {
		if (!target.classList.contains('compat-rbutton')) return;

		openWindow(target.dataset.action).catch(err => makeItShake(target));
	});

	window.on('hashchange', updateTable);
	updateTable();

	(new Request('/api/ckey')).callback((status, body) => {
		if (Request.success(status)) {
			if (body.enabled === true) {
				window.grecaptcha = false;
				reCAPTCHA_sitekey = body.key;
				const gcscr = document.createElement('script');
				gcscr.src = 'https://www.google.com/recaptcha/api.js?render=' + body.key;
				gcscr.async = 'async';
				document.head.appendChild(gcscr);
				return
			}

			window.grecaptcha = 'disabled';
		}
	}).perform();
});
