import { Request } from './request.js';

export const onload = (load_id = null) => {
	const root = $('.editor-root');
	const main = $('.editor-main');
	const data = $('.editor-main > .editor-data');
	const titext = $('.editor-title span');
	const tinput = $('.editor-title input');
	const gtitle = $('.editor-data > .editor-gtitle');
	const pstat = $('.editor-data > .editor-pstatus > select');
	const pcommit = $('.editor-data > .editor-pstatus > input[type="text"]');
	const ptype = $('.editor-data > .editor-ptype');
	const gdistr = $('.editor-data > .editor-gdistr');
	const regions = $$('.editor-data > .editor-regions > .editor-region');
	const reginputs = $$('.editor-data > .editor-regions > .editor-region > input');
	const regselects = $$('.editor-data > .editor-regions > .editor-region > select');
	const gcomment = $('.editor-data > .game-comment');
	const esubresult = $('.editor-data > .editor-subresult');

	const trect = titext.getBoundingClientRect();
	tinput.style.width = `${trect.width + 6}px`;
	tinput.style.height = `${trect.height}px`;

	const showStatus = (success, message) => {
		esubresult.style.color = success ? 'green' : 'red';
		esubresult.innerText = message;
		esubresult.classList.add('show');
		setTimeout(() => esubresult.classList.remove('show'), 4000);
	};

	const pushGameRequest = token => {
		const game = {
			uid: parseInt(data.dataset.uid ?? -1),
			ids: [],
			regions: [],
			title: gtitle.value,
			updated: Date.now(),
			type: ptype.selectedIndex,
			distr: gdistr.selectedIndex,
			status: pstat.selectedIndex,
			comment: gcomment.value,
			rpcsx: pcommit.value
		};

		for (let i = 0; i < regions.length; i++) {
			if (reginputs[i].value === '') break;
			if (!reginputs[i].reportValidity()) return;
			game.ids[i] = reginputs[i].value;
			game.regions[i] = regselects[i].selectedIndex;
		}

		(new Request('/api/db', 'put')).callback((status, body) => {
			if (!Request.success(status)) {
				showStatus(false, `Request failed with code ${status}`);
				return;
			}

			showStatus(body.success, body.message);
		}).perform({token: token, game: game});
	};

	const requestGameInfo = id => {
		main.classList.add('editor-blur');
		(new Request('/api/find/' + id)).callback((status, body) => {
			if (!Request.success(status)) return;
			root.classList.add('expanded');
			main.classList.add('editor-close');
			setTimeout(() => {
				main.classList.remove('editor-blur');
				main.classList.remove('editor-close');
			}, 255);

			if (body !== null && typeof body === 'object' && body.success === true) {
				const game = body.game;
				const gids = game.ids;
				data.dataset.uid = game.uid;
				gtitle.value = game.title;
				pstat.selectedIndex = game.status;
				pcommit.value = game.rpcsx;
				ptype.selectedIndex = game.type;
				gdistr.selectedIndex = game.distr;
				for (let i = 0; i < regions.length; ++i) {
					if (gids[i] === undefined && i > 1) {
						regions[i].style.display = 'none';
						continue;
					} else {
						regions[i].style.display = null;
						regselects[i].selectedIndex = game.regions[i];
						reginputs[i].value = gids[i] ?? '';
					}
				}
				gcomment.value = game.comment;
			} else {
				data.dataset.uid = -1;
				gtitle.value = '';
				pstat.selectedIndex = 0;
				pcommit.value = '';
				ptype.selectedIndex = 0;
				gdistr.selectedIndex = 0;
				for (let i = 0; i < regions.length; ++i) {
					if (i > 1) regions[i].style.display = 'none';
					regselects[i].selectedIndex = i;
					reginputs[i].value = i > 0 ? '' : id;
				}
				gcomment.value = '';
			}
		}).perform();
	};

	const finishEdit = () => {
		const ctext = tinput.value;

		if (titext.innerText !== ctext) {
			if (!tinput.checkValidity()) {
				tinput.blur();
				return;
			}
			tinput.style.display = 'none';
			titext.style.display = 'block';
			if (ctext.length > 0 && titext.innerText !== ctext) {
				titext.innerText = ctext;
				requestGameInfo(ctext);
			} else
				tinput.innerText = 'CUSA00000';
		}
	};

	let validitytimer2 = null;
	$('.editor-regions').on('input', ({target}) => {
		target.value = target.value.toUpperCase();
		if (validitytimer2) clearTimeout(validitytimer2);
		validitytimer2 = setTimeout(() => {
			target.reportValidity();
			validitytimer2 = null;
		}, 1000);

		if (target === reginputs[1]) {
			const shown = target.value.length > 0;
			regions[2].style.display = shown ? 'block' : 'none';
			if (shown == false) reginputs[2].value = '';
		}
	});

	const blurChecker = (target) => {
		if (!target.checkValidity()) {
			setTimeout(() => {
				target.focus();
				target.classList.add('shake');
				setTimeout(() => {
					target.classList.remove('shake');
					if (target.reportValidity())
						finishEdit();
				}, 405);
			}, 100);

			return false;
		}

		return true;
	};

	$('.editor-regions').on('blur', ({target}) => {
		if (target.tagName !== 'INPUT') return;
		blurChecker(target);
	}, true);

	let validitytimer = null;
	tinput.on('input', () => {
		tinput.value = tinput.value.toUpperCase();
		if (validitytimer) clearTimeout(validitytimer);
		validitytimer = setTimeout(() => {
			tinput.reportValidity();
			validitytimer = null;
		}, 1000);
	});

	tinput.on('keyup', ({key}) => {
		if (key === 'Enter') finishEdit();
	});

	tinput.on('blur', () => {
		if (blurChecker(tinput)) {
			tinput.style.display = 'none';
			titext.style.display = 'block';
			finishEdit();
		}
	});

	titext.on('mouseover', ev => {
		titext.style.display = 'none';
		tinput.style.display = 'block';
	});

	$('.editor-title').on('mouseout', ({target, relatedTarget}) => {
		if (target === titext || relatedTarget === null || document.activeElement === tinput) return;
		tinput.style.display = 'none';
		titext.style.display = 'block';
	});

	$('.editor-buttons').on('click', ({target}) => {
		switch (target.id) {
			case 'editor-bclose':
				$('.editor-shadow').click();
				break;
			case 'editor-bsend':
				if (grecaptcha !== 'disabled') {
					if (grecaptcha !== false) {
						target.classList.add('busy');
						grecaptcha.ready(() => {
							try {
								grecaptcha.execute(window._captcha_sitekey, {action: 'submit'}).then(token => {
									pushGameRequest(token);
									target.classList.remove('busy');
								});
							} catch (err) {
								showStatus(false, err.message);
								target.classList.remove('busy');
							}
						});

						break;
					}

					showStatus(false, 'reCAPTCHA is not ready yet');
					break;
				}

				pushGameRequest(null);
				break;
		}
	});

	if (load_id !== null) {
		tinput.value = titext.innerText = load_id;
		requestGameInfo(load_id);
	}
};
