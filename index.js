const localesDirect = {
	en: {
		closed: 'Wock closed',
		closedReason: 'Wock closed, reason: {{reason}}',
		opened: 'Wock opened, url: {{url}}',
		openedReason: 'Wock opened, url: {{url}}, reason: {{reason}}',
		install: 'install'
	},
	zh: {
		closed: 'Wock已关闭',
		closedReason: 'Wock已关闭，原因：{{reason}}',
		opened: 'Wock已打卡，目标：{{url}}',
		openedReason: 'Wock已打卡，目标：{{url}}，原因：{{reason}}',
		install: '初始化'
	},
};
const localesHighlight = {
	en: {
		closed: '~[Wock] closed',
		closedReason: '~[Wock] closed, ~[reason]~{{{reason}}}',
		opened: '~[Wock] opened, ~[url]~{{{url}}}',
		openedReason: '~[Wock] opened, ~[url]~{{{url}}}, ~[reason]~{{{reason}}}',
		install: 'install'
	},
	zh: {
		closed: '~[Wock]已关闭',
		closedReason: '~[Wock]已关闭，~[原因]~{{{reason}}}',
		opened: '~[Wock]已打卡，~[目标]~{{{url}}}',
		openedReason: '~[Wock]已打卡，~[目标]~{{{url}}}，~[原因]~{{{reason}}}',
		install: '初始化'
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


		this.WebSocket = webSocket ?? WebSocket;
	}

	/**
	 * @param {string} reason
	 * @returns {Wock}
	 */
	open(reason) {
		if(this.opening) { return; }

		this.wock = new this.WebSocket(this.url);

		let pingOut;
		let timeOut;
		let outCount = 0;

		let oneOff = false;
		let closeHandle = (reason, ...params) => {
			if(oneOff) { return; }

			oneOff = true;

			this.log.info(this.TT(reason ? 'closedReason' : 'close', { reason }), ...params);

			if(this.ping) {
				clearTimeout(pingOut);
				clearTimeout(timeOut);
			}

			this.opening = false;

			if(this.reopen) {
				setTimeout(async () => {
					await this.open('reopen');

					if(typeof this.reopen == 'function') {
						this.reopen(this);
					}
				}, 4000);
			}
		};

		this.wock.addEventListener('error', e => closeHandle('error', e));
		this.wock.addEventListener('close', e => closeHandle('close', e));

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

				let check = (clearCount = true) => {
					clearTimeout(pingOut);
					clearTimeout(timeOut);

					if(clearCount) {
						outCount = 0;
					}

					pingOut = setTimeout(() => {
						this.wock.cast('ping');

						timeOut = setTimeout(() => {
							outCount++;

							if(outCount >= 4) {
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
