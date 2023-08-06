import {onload} from './editor.js';

const genHTML = () => {
	const xhr = new XMLHttpRequest();
	xhr.onload = () => {
		const base = $('div.compat-base');
		const body = document.body;
		const shadow = document.createElement('div');
		shadow.classList = 'editor-shadow';

		const root = document.createElement('div');
		root.classList = 'editor-root';
		root.innerHTML = xhr.responseText;
		shadow.appendChild(root);

		shadow.addEventListener('click', ev => {
			if (ev.target === shadow) {
				base.classList.add('editor-close');
				root.classList.add('editor-close');
				shadow.classList.add('editor-close');
				setTimeout(() => {
					body.style.overflowY = null;
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
		body.style.overflowY = 'hidden';
		shadow.style.display = 'flex';
		body.appendChild(shadow);
		onload();
	};
	xhr.open('get', 'editor.html');
	xhr.send();
};

export const start = () => {
	return new Promise((res, rej) => {
		if ($('#editor-style'))
			return res(genHTML());

		const style = document.createElement('link');
		style.id = 'editor-style';
		style.href = 'css/eloader.css';
		style.rel = 'stylesheet';
		style.onload = () => res(genHTML());
		document.head.appendChild(style);
	});
};
