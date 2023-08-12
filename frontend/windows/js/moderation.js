import { makeItShake } from '../../js/main.js';
import { Request } from '../../js/request.js';

class ModRequest extends Request {
	constructor(path, method, ekey) {
		super(path, method);

		const key = localStorage.getItem('mod-key') ?? ekey;
		if (key) this.header('Mod-Key', key);
	}
};

export const onload = wdata => {
	const moder = $('.win-root.moderation');
	const keyinp = $('.moder-key > input');
	const infotext = $('.moder-text');

	let animlock = false;
	$('.moderation > .moder-text').on('click', ({target}) => {
		if (animlock) return;
		animlock = true;

		let action = infotext.dataset.hideaction;
		if (moder.classList.contains('auth-fail'))
			action = 'relogin';

		target.style.animation = 'mod-fadein 125ms forwards';
		setTimeout(() => {
			switch (action) {
				case 'relogin':
					keyinp.style.animation = 'mod-fadeout 125ms forwards';
					break;
			}
			moder.classList.remove('moder-mesg');
			setTimeout(() => {
				switch (action) {
					case 'relogin':
						keyinp.style.animation = null;
						keyinp.focus();
						break;
					case 'rerequest':
						loadList();
						break;
				}
				target.style.animation = null;
				animlock = false;
			}, 125);
		}, 125);
	});

	let entertimer = null;

	const setValidKey = (key) => {
		localStorage.setItem('mod-key', key);
		moder.classList.remove('moder-mesg');
		moder.classList.add('authed');
	};

	const showModMesg = (text, cact = null) => {
		moder.classList.add('moder-mesg');
		infotext.dataset.hideaction = cact;
		infotext.innerHTML = text;
	};

	const removeModKey = () => {
		if (localStorage.getItem('mod-key')) {
			showModMesg('Your moderation key is not valid anymore.<br>Click here to enter a new one.');
			localStorage.removeItem('mod-key');
			moder.classList.add('auth-fail');
			moder.classList.remove('authed');
			keyinp.value = '';
		}
	};

	const emptyList = () => {
		showModMesg(
			'There are no unapproved changes at the moment. Try again later.<br>Click here to reload the list.',
			'rerequest'
		);
	};

	const loadList = () => {
		(new ModRequest('/api/unapproved')).callback((status, body) => {
			if (!Request.success(status)) {
				showModMesg('Request to the server failed.<br>Click here to try again.', 'rerequest');
				return;
			}

			if (body.success === false) {
				showModMesg(body.message + '<br>Click here to try again.', 'rerequest');
				return;
			}

			const items = body.items;
			if (items.length > 0) {

				return;
			}

			emptyList();
		}).perform();
	};

	const testModKey = () => {
		clearTimeout(entertimer);
		entertimer = null;

		const text = keyinp.value;
		if (text.length < 24) {
			makeItShake(keyinp);
			removeModKey();
			return;
		}

		if (keyinp.reportValidity()) {
			(new ModRequest('/api/checkmkey', 'get', encodeURIComponent(keyinp.value))).callback((status, body) => {
				if (!ModRequest.success(status)) {
					alert(`Unexpected checkmkey request error: ${status}\nPlease try again later.`);
					return;
				}

				if (body.valid !== true) {
					makeItShake(keyinp);
					removeModKey();
					return;
				}

				setValidKey(text);
				loadList();
			}).perform();
		}
	};

	const testValidity = () => {
		keyinp.reportValidity();
		entertimer = null;
	};

	keyinp.on('input', ev => {
		const text = keyinp.value;
		if (entertimer) clearTimeout(entertimer);
		entertimer = text.length < 24 ?
		setTimeout(() => testValidity(), 1000) :
		setTimeout(() => testModKey(), 1000);
	});

	keyinp.on('keydown', ({code}) => {
		if (code === 'Enter')
			testModKey();
	});

	keyinp.value = localStorage.getItem('mod-key');
	if (keyinp.value !== '') testModKey();
	keyinp.focus();
};
