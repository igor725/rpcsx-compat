import { makeItShake } from '../../js/main.js';
import { Request } from '../../js/request.js';

export const onload = wdata => {
	const moder = $('.moderation');
	const keyinp = $('.moder-key > input');

	let animlock = false;
	$('.moderation > .moder-fail').on('click', ({target}) => {
		if (animlock) return;
		animlock = true;

		target.style.animation = 'mod-fadein 125ms forwards';
		setTimeout(() => {
			keyinp.style.animation = 'mod-fadeout 125ms forwards';
			moder.classList.remove('auth-fail');
			setTimeout(() => {
				keyinp.style.animation = null;
				target.style.animation = null;
				animlock = false;
				keyinp.focus();
			}, 125);
		}, 125);
	});

	let entertimer = null;

	const testModKey = () => {
		clearTimeout(entertimer);
		entertimer = null;

		const text = keyinp.value;
		if (text.length < 24) {
			makeItShake(keyinp);
			return;
		}

		if (keyinp.reportValidity()) {
			(new Request(`/api/checkmkey?k=${encodeURIComponent(text)}`)).callback((status, body) => {
				if (!Request.success(status)) {
					alert(`Unexpected checkmkey request error: ${status}\nPlease try again later.`);
					return;
				}

				if (body.valid !== true) {
					makeItShake(keyinp);
					return;
				}
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
};
