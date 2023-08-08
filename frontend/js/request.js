export class Request {
	#_xhr; #_cb;

	constructor(request, method = 'get') {
		const xhr = this.#_xhr = new XMLHttpRequest();
		if (request.indexOf('/api/') === 0)
			xhr.responseType = 'json';
		xhr.onreadystatechange = () => this.#_loaded();
		xhr.open(method, request);
		this.#_cb = null;
	}

	callback = (func) => {
		this.#_cb = func;
		return this;
	}

	#_loaded = () => {
		const cb = this.#_cb;
		const xhr = this.#_xhr;
		if (cb !== null && xhr.readyState === XMLHttpRequest.DONE)
			cb(xhr.status, xhr.response);
	}

	perform = (body = null, type = 'application/json') => {
		this.#_xhr.setRequestHeader('content-type', type);

		switch (typeof body) {
			case 'string':
				this.#_xhr.send(body);
				break;
			case 'object':
				this.#_xhr.send(JSON.stringify(body));
				break;

			default: throw new Error('Unsupported body type');
		}
	}

	static success = (status) => status === 200 || status === 304;
};
