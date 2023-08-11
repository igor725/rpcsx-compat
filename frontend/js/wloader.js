import { Request } from './request.js';

const genHTML = (wname, wdata) => {
	(new Request(`/windows/${wname}.html`)).callback((status, body) => {
		if (!Request.success(status)) {
			alert(`Failed to generate window: ${status}`);
			return;
		}

		const oldshadow = $('.win-shadow');
		if (oldshadow) oldshadow.remove();
		const base = $('div.compat-base');
		const bodyel = document.body;
		const shadow = document.createElement('div');
		shadow.classList = 'win-shadow';
		shadow.innerHTML = body;

		shadow.addEventListener('click', ({target}) => {
			if (shadow.classList.contains('close')) return;
			if (target === shadow || target.classList.contains('btn-close')) {
				base.classList.add('close');
				shadow.classList.add('close');
				const wroot = $('.win-root');
				if (wroot) wroot.classList.add('close');
				setTimeout(() => {
					base.classList.remove('smooth-blur');
					base.classList.remove('close');
					bodyel.style.overflowY = null;
					shadow.remove();
				}, 255);
			}
		});

		window.addEventListener('keyup', ev => {
			if (ev.code === 'Escape')
				shadow.click();
		});

		base.classList.add('smooth-blur');
		bodyel.style.overflowY = 'hidden';
		shadow.style.visibility = 'visible';
		$('.compat-base').after(shadow);
		window.getComputedStyle(shadow).opacity;
		shadow.classList += ' ready';
		import(`/windows/js/${wname}.js`).then(wjs => wjs.onload(wdata));
	}).perform();
};

export const open = (wname = null, wdata = null) => {
	return new Promise((res, rej) => {
		if (typeof wname !== 'string')
			return rej('invalid wname type');

		const sname = `#${wname}-style`;

		if ($(sname))
			return res(genHTML(wname, wdata));

		const style = document.createElement('link');
		style.classList = sname;
		style.href = `/windows/css/${wname}.css`;
		style.rel = 'stylesheet';
		style.onload = () => res(genHTML(wname, wdata));
		style.onerror = () => {
			style.remove();
			rej();
		}
		document.head.appendChild(style);
	});
};
