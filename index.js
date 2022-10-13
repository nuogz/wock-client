const localesDirect = {
	en: {
		closed: 'Wock closed',
		closedReason: 'Wock closed, reason: {{reason}}',
		opened: 'Wock opened, url: {{url}}',
		openedReason: 'Wock opened, url: {{url}}, reason: {{reason}}',
		install: 'install',
		reopen: 'reopen',
	},
	zh: {
		closed: 'Wock已断开',
		closedReason: 'Wock已断开，原因：{{reason}}',
		opened: 'Wock已连接，目标：{{url}}',
		openedReason: 'Wock已连接，目标：{{url}}，原因：{{reason}}',
		install: '初始化',
		reopen: '重新连接',
	},
};
const localesHighlight = {
	en: {
		closed: '~[Wock] closed',
		closedReason: '~[Wock] closed, ~[reason]~{{{reason}}}',
		opened: '~[Wock] opened, ~[url]~{{{url}}}',
		openedReason: '~[Wock] opened, ~[url]~{{{url}}}, ~[reason]~{{{reason}}}',
		install: 'install',
		reopen: 'reopen',
	},
	zh: {
		closed: '~[Wock]已断开',
		closedReason: '~[Wock]已断开，~[原因]~{{{reason}}}',
		opened: '~[Wock]已连接，~[目标]~{{{url}}}',
		openedReason: '~[Wock]已连接，~[目标]~{{{url}}}，~[原因]~{{{reason}}}',
		install: '初始化',
		reopen: '重新连接',
	},
};


export default class Wock {
	/** @type {WebSocket} */
	WebSocket;


	log = {
		locale: 'en',
		isHightlight: false,
		info: () => { },
		error: () => { },
	};


	constructor(url, { logInfo, logError, locale, isHightlight }, webSocket) {
		this.url = url;

		this.ping = true;
		this.reopen = true;
		this.opening = false;

		this.handles_type = {
			$open: [],
			ping: [wock => wock.cast('pong')],
		};
		this.keysHandlesOnce = new Set();


		if(typeof logInfo == 'function') { this.log.info = logInfo; }
		if(typeof logError == 'function') { this.log.error = logError; }
		if(locale) { this.log.locale = locale; }
		this.log.isHightlight = ~~isHightlight;

		const locales = this.log.isHightlight ? localesHighlight : localesDirect;
		this.log.locales = locales[locale] ?? locales[(this.locale ?? '').split(' - ')[0]] ?? locales.en;
		this.TT = (key, info) => this.log.locales[key]?.replace(/{{(.*?)}}/g, (matchRaw, match) => info[match] || matchRaw) || key;
		this.TT = (key, info) => this.log.locales[key]?.replace(/(?<!~){{(.*?)}}/g, (matchRaw, match) => info[match] || matchRaw) || key;


		this.WebSocket = webSocket ?? WebSocket;
	}

	/**
	 * @param {string} reason
	 * @returns {Wock}
	 */
	open(reason) {
		if(this.opening) { return; }

		this.wock = new this.WebSocket(this.url);

		let idPingout;
		let idTimeout;
		let countTimeout = 0;

		let isCloseHandled = false;
		const closeHandle = (reason, ...params) => {
			if(isCloseHandled) { return; }

			isCloseHandled = true;

			this.log.info(this.TT(reason ? 'closedReason' : 'close', { reason }), ...params);

			if(this.ping) {
				clearTimeout(idPingout);
				clearTimeout(idTimeout);
			}

			this.opening = false;

			if(this.reopen) {
				setTimeout(async () => {
					await this.open(this.TT('reopen'));

					if(typeof this.reopen == 'function') {
						this.reopen(this);
					}
				}, 4000);
			}
		};

		this.wock.addEventListener('error', event => closeHandle('error', event?.error instanceof Error ? event.error : event));
		this.wock.addEventListener('close', event => closeHandle('close', typeof event?.code == 'number' ? event.code : event));

		return new Promise(resolve => {
			this.wock.addEventListener('open', () => {
				this.opening = true;

				this.log.info(this.TT(reason ? 'openedReason' : 'opened', { reason, url: this.url }));

				this.wock.cast = (type, ...data) => {
					try {
						this.wock.send(JSON.stringify({ type, data }));
					}
					catch(error) {
						if(error.message.indexOf('CLOSED') == -1) {
							this.logError(error);
						}
					}
				};

				const check = (clearCount = true) => {
					clearTimeout(idPingout);
					clearTimeout(idTimeout);

					if(clearCount) {
						countTimeout = 0;
					}

					idPingout = setTimeout(() => {
						this.wock.cast('ping');

						idTimeout = setTimeout(() => {
							countTimeout++;

							if(countTimeout >= 4) {
								this.wock.close();
							}
							else {
								check(false);
							}
						}, 24000);
					}, 10000);
				};

				this.wock.addEventListener('message', async raw => {
					if(this.ping) { check(); }

					let event = {};
					try {
						event = JSON.parse(raw.data);
					}
					catch(error) { return; }

					const type = event.type;
					const handles = this.handles_type[type];
					if(type && handles) {
						for(let id = 1; id <= handles.length; id++) {
							const handle = handles[id - 1];

							try {
								if(event.data instanceof Array) {
									await handle(...event.data, this.wock);
								}
								else {
									await handle(event.data, this.wock);
								}

								if(this.keysHandlesOnce.has(`${type}:${id + 1}`)) {
									this.del(type, id + 1);
								}
							} catch(error) {
								if(error instanceof Error) {
									(console || {}).error(error.message);
									(console || {}).error(error.stack);
								}
								else {
									(console || {}).error(error);
								}
							}

						}
					}
				});

				if(this.ping) { check(); }

				this.handles_type.$open.forEach((handle, id) => {
					if(!handle) { return; }
					setTimeout(() => handle(this), 0);
					if(this.keysHandlesOnce.has(`$open:${id + 1}`)) {
						this.del('$open', id + 1);
					}
				});


				resolve(this);
			});
		});
	}

	add(type, handle) {
		if(!type && !(handle instanceof Function)) { return 0; }

		const handles = this.handles_type[type] ?? (this.handles_type[type] = []);

		return handles.push(handle);
	}
	one(type, handle) {
		if(!type && !(handle instanceof Function)) { return 0; }

		const id = this.add(type, handle);

		this.keysHandlesOnce.add(`${type}:${id}`);

		return id;
	}
	del(type, id) {
		const handles = this.handles_type[type];

		if(!type || !handles || id > handles.length || !~~id) { return false; }

		const handle = handles[id - 1];

		handles[id - 1] = false;

		return handle;
	}


	cast(type, ...data) { return this.wock.cast(type, ...data); }
	onec(type, handle, ...data) {
		const id = this.one(type, handle);

		this.cast(type, ...data);

		return id;
	}
	addc(type, handle, ...data) {
		const id = this.add(type, handle);

		this.cast(type, ...data);

		return id;
	}
	at(type, handle, once = false) {
		if(type == 'open' && this.opening) {
			setTimeout(() => handle(), 0);
		}
		else if(once) {
			return this.one(`$${type}`, handle);
		}
		else {
			return this.add(`$${type}`, handle);
		}
	}


	get(type, id) {
		return this.handles_type[type]?.[id - 1];
	}
	run(type, id, ...data) {
		const handle = this.handles_type[type]?.[id - 1];

		if(handle instanceof Function) { return handle(...data); }
	}
}

/** @type {Wock} */
export let $wock;
export const install = app => {
	$wock = new Wock(
		new URL('wock', location.origin).toString().replace(/^http/, 'ws'),
		{
			logInfo: (console || {}).log,
			logError: (console || {}).error,
			locale: 'zh',
		}
	);

	$wock.open($wock.TT('install'));

	app.config.globalProperties.$wock = $wock;
	app.provide('$wock', $wock);
};
