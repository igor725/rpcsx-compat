import { onload } from './editor.js';
import { Request } from './request.js';

const genHTML = (gid) => {
	(new Request('/editor.html')).callback((status, body) => {
		if (!Request.success(status)) {
			alert(`Failed to run editor: ${status}`);
			return;
		}

		const oldshadow = $('.editor-shadow');
		if (oldshadow) oldshadow.remove();
		const base = $('div.compat-base');
		const bodyel = document.body;
		const shadow = document.createElement('div');
		shadow.classList = 'editor-shadow';

		const root = document.createElement('div');
		root.classList = 'editor-root';
		root.innerHTML = body;
		shadow.appendChild(root);

		shadow.addEventListener('click', ev => {
			if (ev.target === shadow) {
				base.classList.add('editor-close');
				root.classList.add('editor-close');
				shadow.classList.add('editor-close');
				setTimeout(() => {
					bodyel.style.overflowY = null;
					base.classList.remove('editor-blur');
					base.classList.remove('editor-close');
					shadow.remove();
				}, 255);
			}
		});

		window.addEventListener('keyup', ev => {
			if (ev.code === 'Escape')
				shadow.click();
		});

		base.classList.add('editor-blur');
		bodyel.style.overflowY = 'hidden';
		shadow.style.visibility = 'visible';
		$('.compat-base').after(shadow);
		onload(gid);
	}).perform();
};

export const startEditor = (gid = null) => {
	return new Promise((res, rej) => {
		if ($('#editor-style'))
			return res(genHTML(gid));

		const style = document.createElement('link');
		style.id = 'editor-style';
		style.href = '/css/eloader.css';
		style.rel = 'stylesheet';
		style.onload = () => res(genHTML(gid));
		document.head.appendChild(style);
	});
};
