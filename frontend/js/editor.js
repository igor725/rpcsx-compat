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
	const gcomment = $('.editor-data > .game-comment');
	const esubresult = $('.editor-data > .editor-subresult');
	const regions = $('.editor-regions');

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

		const regions = $$('.editor-region');
		for (let i = 0; i < regions.length; ++i) {
			const region = regions[i];
			const code = region.$('input').value;
			if (code === '') break;
			game.ids[i] = code;
			game.regions[i] = region.$('select').selectedIndex;
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
				const gregs = game.regions;
				data.dataset.uid = game.uid;
				gtitle.value = game.title;
				pstat.selectedIndex = game.status;
				pcommit.value = game.rpcsx;
				ptype.selectedIndex = game.type;
				gdistr.selectedIndex = game.distr;

				let region = $('.editor-region');
				for (let i = 0; i < gids.length; ++i) {
					const input = region.$('input');
					input.value = gids[i];
					region.$('select').selectedIndex = gregs[i];
					input.dispatchEvent(new Event('input'));
					region = region.nextElementSibling ?? region.parentNode.nextElementSibling.$('.editor-region');
				}

				const regions = $$('.editor-region');
				for (let i = regions.length - 1; i >= gids.length; --i) {
					const input = regions[i].$('input');
					if (input.value !== '' || i === 0) {
						input.value = i === 0 ? id : '';
						input.dispatchEvent(new Event('input'));
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

				const regions = $$('.editor-region');
				for (let i = regions.length - 1; i >= 0; --i) {
					const input = regions[i].$('input');
					if (input.value !== '' || i === 0) {
						input.value = i === 0 ? id : '';
						input.dispatchEvent(new Event('input'));
					}
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
	}, true);

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

	regions.on('blur', ({target}) => {
		if (target.tagName !== 'INPUT') return;
		if (blurChecker(target) && target.dataset.restore === '1') {
			target.dataset.restore = null;
			target.value = 'CUSA00000';
		}
	}, true);

	const cloneRegion = reg => {
		const newregion = reg.cloneNode(true);
		newregion.$('select').selectedIndex = 0;
		newregion.$('input').value = '';
		return newregion;
	};

	regions.on('input', ({target}) => {
		const region = target.parentNode;
		const nextregion = region.nextElementSibling;
		const regrid = region.parentNode;
		const regridregs = regrid.$$('.editor-region');
		const nextregrid = regrid.nextElementSibling;

		if (nextregion === null && regridregs.length === 1) {
			regrid.appendChild(cloneRegion(region));
		} else if (nextregrid === null && nextregion === null) {
			const newregrid = regrid.cloneNode();
			newregrid.appendChild(cloneRegion(region));
			regions.appendChild(newregrid);
		} else if (target.value === '') {
			if (regridregs.length === 2) {
				const regridnextinput = regridregs[1].$('input');
				if (regridnextinput === target) {
					if (nextregrid.$$('.editor-region').length > 1) {
						target.dataset.restore = '1';
					} else {
						nextregrid.remove();
					}
				} else if (regridnextinput.value === '') {
					nextregion.remove();
				} else {
					target.dataset.restore = '1';
				}
			} else if (nextregion === null) {
				regrid.remove();
			}
		}
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
