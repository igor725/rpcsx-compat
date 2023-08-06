export const onload = () => {
	const titext = $('.editor-title span');
	const tinput = $('.editor-title input');

	const trect = titext.getBoundingClientRect();
	tinput.style.width = `${trect.width + 6}px`;
	tinput.style.height = `${trect.height}px`;

	titext.addEventListener('mouseover', ev => {
		titext.style.display = 'none';
		tinput.style.display = 'block';
	});

	$('.editor-title').addEventListener('mouseout', ev => {
		if (ev.target === titext) return;
		tinput.style.display = 'none';
		titext.style.display = 'block';
		if (tinput.value.length > 0)
			titext.innerText = tinput.value = tinput.value.toUpperCase();
		else
			tinput.innerText = 'CUSA00000';
	});

	$('.editor-buttons').addEventListener('click', ({target}) => {
		switch (target.id) {
			case 'editor-bclose':
				$('.editor-shadow').click();
				break;
			case 'editor-bsend':
				break;
		}
	});
};
