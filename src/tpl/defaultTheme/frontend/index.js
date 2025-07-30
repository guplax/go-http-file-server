(function () {
	function logError(err) {
		console.error(err);
	}

	var strUndef = 'undefined';
	var protoHttps = 'https:';

	var classNone = 'none';
	var classHeader = 'header';

	var selectorIsNone = '.' + classNone;
	var selectorNotNone = ':not(' + selectorIsNone + ')';
	var selectorPathList = '.path-list';
	var selectorItemList = '.item-list';
	var selectorItem = 'li:not(.' + classHeader + '):not(.parent)';
	var selectorItemIsNone = selectorItem + selectorIsNone;
	var selectorItemNotNone = selectorItem + selectorNotNone;

	var leavingEvent = typeof window.onpagehide !== strUndef ? 'pagehide' : 'beforeunload';

	var Enter = 'Enter';
	var Escape = 'Escape';
	var Esc = 'Esc';
	var Space = ' ';

	var hasStorage = false;
	try {
		if (typeof sessionStorage !== strUndef) hasStorage = true;
	} catch (err) {
	}

	var filteredText = '';

	function matchFilter(input) {
		return input.toLowerCase().indexOf(filteredText) >= 0;
	}

	var lastFocused;

	var errLacksMkdir = new Error("mkdir permission is not enabled")

	function enableFilter() {
		var filter = document.body.querySelector('.filter');
		if (!filter) return;

		var input = filter.querySelector('input');
		if (!input) return;

		var clear = filter.querySelector('button');
		if (!clear) clear = document.createElement('button');

		var itemList = document.querySelector(selectorItemList)

		var timeoutId;
		var doFilter = function () {
			var filteringText = input.value.trim().toLowerCase();
			if (filteringText === filteredText) return;

			var items
			if (filteringText) {
				clear.style.display = 'block';

				var selector
				if (filteringText.indexOf(filteredText) >= 0) {	// increment search, find in visible items
					selector = selectorItemNotNone;
				} else if (filteredText.indexOf(filteringText) >= 0) {	// decrement search, find in hidden items
					selector = selectorItemIsNone;
				} else {
					selector = selectorItem;
				}
				filteredText = filteringText;

				items = itemList.querySelectorAll(selector);
				if (!items.forEach) items = Array.prototype.slice.call(items);	// IE9+/ClassicEdge
				items.forEach(function (item) {
					var name = item.querySelector('.name');
					if (matchFilter(name.textContent)) {
						if (selector !== selectorItemNotNone) {
							item.classList.remove(classNone);
						}
					} else {
						if (selector !== selectorItemIsNone) {
							item.classList.add(classNone);
						}
					}
				});
			} else {	// filter cleared, show all items
				clear.style.display = '';
				filteredText = '';

				items = itemList.querySelectorAll(selectorItemIsNone);
				if (!items.forEach) items = Array.prototype.slice.call(items);	// IE9+/ClassicEdge
				items.forEach(function (item) {
					item.classList.remove(classNone);
				});
			}
		};

		var onValueMayChange = function () {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(doFilter, 350);
		};
		input.addEventListener('input', onValueMayChange);
		input.addEventListener('change', onValueMayChange);

		var onEnter = function () {
			clearTimeout(timeoutId);
			input.blur();
			doFilter();
		};
		var onEscape = function () {
			clearTimeout(timeoutId);
			input.value = '';
			doFilter();
		};

		input.addEventListener('keydown', function (e) {
			switch (e.key) {
				case Enter:
					onEnter();
					e.preventDefault();
					break;
				case Escape:
				case Esc:
					onEscape();
					e.preventDefault();
					break;
			}
		});
		clear.addEventListener('click', function () {
			onEscape();
			input.focus();
		});

		// init
		if (hasStorage) {
			var prevSessionFilter = sessionStorage.getItem(location.pathname);
			if (prevSessionFilter) {
				input.value = prevSessionFilter;
			}
			if (prevSessionFilter !== null) {
				sessionStorage.removeItem(location.pathname);
			}

			window.addEventListener(leavingEvent, function () {
				if (input.value) {
					sessionStorage.setItem(location.pathname, input.value);
				}
			});

		}
		if (input.value) {
			doFilter();
		}
	}

	function keepFocusOnBackwardForward() {
		function onFocus(e) {
			var link = e.target.closest('a');
			if (!link || link === lastFocused) return;
			lastFocused = link;
		}

		var itemList = document.body.querySelector(selectorItemList);
		itemList.addEventListener('focusin', onFocus);
		itemList.addEventListener('click', onFocus);
		window.addEventListener('pageshow', function () {
			if (lastFocused && lastFocused !== document.activeElement) {
				lastFocused.focus();
				lastFocused.scrollIntoView({block: 'center'});
			}
		});
	}

	function focusChildOnNavUp() {
		function extractCleanUrl(url) {
			var sepIndex = url.indexOf('?');
			if (sepIndex < 0) sepIndex = url.indexOf('#');
			if (sepIndex >= 0) {
				url = url.slice(0, sepIndex);
			}
			return url;
		}

		var prevUrl = document.referrer;
		if (!prevUrl) return;
		prevUrl = extractCleanUrl(prevUrl);

		var currUrl = extractCleanUrl(location.href);

		if (prevUrl.length <= currUrl.length) return;
		if (prevUrl.slice(0, currUrl.length) !== currUrl) return;
		var goesUp = prevUrl.slice(currUrl.length);
		if (currUrl[currUrl.length - 1] !== '/' && goesUp[0] !== '/') return;
		var matchInfo = /[^/]+/.exec(goesUp);
		if (!matchInfo) return;
		var prevChildName = matchInfo[0];
		if (!prevChildName) return;
		prevChildName = decodeURIComponent(prevChildName);
		if (!matchFilter(prevChildName)) return;

		var items = document.body.querySelectorAll(selectorItemList + '>' + selectorItemNotNone);
		items = Array.prototype.slice.call(items);
		var selectorName = '.field.name';
		var selectorLink = 'a';
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var elName = item.querySelector(selectorName);
			if (!elName) continue;

			var text = elName.textContent;
			if (text[text.length - 1] === '/') {
				text = text.slice(0, -1);
			}
			if (text !== prevChildName) continue;

			var elLink = item.querySelector(selectorLink);
			if (!elLink) break;

			lastFocused = elLink;
			elLink.focus();
			elLink.scrollIntoView({block: 'center'});
		}
	}

	function enableKeyboardNavigate() {
		var pathList = document.body.querySelector(selectorPathList);
		var itemList = document.body.querySelector(selectorItemList);
		if (!pathList && !itemList) {
			return;
		}

		function getFocusableSibling(container, isBackward, startA) {
			if (!startA) {
				startA = container.querySelector(':focus');
			}
			var startLI = startA && startA.closest('li');
			if (!startLI) {
				if (isBackward) {
					startLI = container.firstElementChild;
				} else {
					startLI = container.lastElementChild;
				}
			}
			if (!startLI) {
				return;
			}

			var siblingLI = startLI;
			do {
				if (isBackward) {
					siblingLI = siblingLI.previousElementSibling || container.lastElementChild;
				} else {
					siblingLI = siblingLI.nextElementSibling || container.firstElementChild;
				}
			} while (siblingLI !== startLI && (
				siblingLI.classList.contains(classNone) ||
				siblingLI.classList.contains(classHeader)
			));

			if (siblingLI) {
				var siblingA = siblingLI.querySelector('a');
				return siblingA;
			}
		}

		function getFirstFocusableSibling(container) {
			var a = container.querySelector('li:not(.' + classNone + '):not(.' + classHeader + ') a');
			return a;
		}

		function getLastFocusableSibling(container) {
			var a = container.querySelector('li a');
			a = getFocusableSibling(container, true, a);
			return a;
		}

		function getMatchedFocusableSibling(container, isBackward, startA, buf) {
			var skipRound = buf.length === 1;	// find next single-char prefix
			var firstCheckA;
			var secondCheckA;
			var a = startA;
			do {
				if (skipRound) {
					skipRound = false;
					continue;
				}
				if (!a) {
					continue;
				}

				// firstCheckA maybe a focused a that not belongs to the list
				// secondCheckA must be in the list
				if (!firstCheckA) {
					firstCheckA = a;
				} else if (firstCheckA === a) {
					return;
				} else if (!secondCheckA) {
					secondCheckA = a;
				} else if (secondCheckA === a) {
					return;
				}

				var textContent = (a.querySelector('.name') || a).textContent.toLowerCase();
				if (textContent.startsWith(buf)) {
					return a;
				}
			} while (a = getFocusableSibling(container, isBackward, a));
		}

		var ARROW_UP = 'ArrowUp';
		var ARROW_DOWN = 'ArrowDown';
		var ARROW_LEFT = 'ArrowLeft';
		var ARROW_RIGHT = 'ArrowRight';

		var SKIP_TAGS = ['INPUT', 'BUTTON', 'TEXTAREA'];

		var PLATFORM = navigator.platform || navigator.userAgent;
		var IS_MAC_PLATFORM = PLATFORM.indexOf('Mac') >= 0 || PLATFORM.indexOf('iPhone') >= 0 || PLATFORM.indexOf('iPad') >= 0 || PLATFORM.indexOf('iPod') >= 0

		var lookupKey;
		var lookupBuffer;
		var lookupStartA;
		var lookupTimer;

		function clearLookupContext() {
			lookupKey = undefined;
			lookupBuffer = '';
			lookupStartA = null;
		}

		clearLookupContext();

		function delayClearLookupContext() {
			clearTimeout(lookupTimer);
			lookupTimer = setTimeout(clearLookupContext, 850);
		}

		function lookup(container, key, isBackward) {
			key = key.toLowerCase();

			var currentLookupStartA;
			if (key === lookupKey) {
				// same as last key, lookup next single-char prefix
				currentLookupStartA = container.querySelector(':focus');
			} else {
				if (!lookupStartA) {
					lookupStartA = container.querySelector(':focus');
				}
				currentLookupStartA = lookupStartA;
				if (lookupKey === undefined) {
					lookupKey = key;
				} else {
					// key changed, no more single-char prefix match
					lookupKey = '';
				}
			}
			lookupBuffer += key;
			delayClearLookupContext();
			return getMatchedFocusableSibling(container, isBackward, currentLookupStartA, lookupKey || lookupBuffer);
		}

		var canArrowMove;
		var isToEnd;
		if (IS_MAC_PLATFORM) {
			canArrowMove = function (e) {
				return !(e.ctrlKey || e.shiftKey || e.metaKey);	// only allow Opt
			}
			isToEnd = function (e) {
				return e.altKey;	// Opt key
			}
		} else {
			canArrowMove = function (e) {
				return !(e.altKey || e.shiftKey || e.metaKey);	// only allow Ctrl
			}
			isToEnd = function (e) {
				return e.ctrlKey;
			}
		}

		function getFocusItemByKeyPress(e) {
			if (SKIP_TAGS.indexOf(e.target.tagName) >= 0) {
				return;
			}

			if (canArrowMove(e)) {
				switch (e.key) {
					case ARROW_DOWN:
						if (isToEnd(e)) {
							return getLastFocusableSibling(itemList);
						} else {
							return getFocusableSibling(itemList, false);
						}
					case ARROW_UP:
						if (isToEnd(e)) {
							return getFirstFocusableSibling(itemList);
						} else {
							return getFocusableSibling(itemList, true);
						}
					case ARROW_RIGHT:
						if (isToEnd(e)) {
							return getLastFocusableSibling(pathList);
						} else {
							return getFocusableSibling(pathList, false);
						}
					case ARROW_LEFT:
						if (isToEnd(e)) {
							return getFirstFocusableSibling(pathList);
						} else {
							return getFocusableSibling(pathList, true);
						}
				}
			}
			if (!e.ctrlKey && (!e.altKey || IS_MAC_PLATFORM) && !e.metaKey && e.key.length === 1) {
				return lookup(itemList, e.key, e.shiftKey);
			}
		}

		document.addEventListener('keydown', function (e) {
			var newFocusEl = getFocusItemByKeyPress(e);
			if (newFocusEl) {
				e.preventDefault();
				newFocusEl.focus();
			}
		});
	}

	function enhanceUpload() {
		var upload = document.body.querySelector('.upload');
		if (!upload) return;

		var form = upload.querySelector('form');
		if (!form) return;

		var fileInput = form.querySelector('input[type=file]');
		if (!fileInput) return;

		var submitButton = form.querySelector('[type=submit]');
		if (submitButton) submitButton.classList.add(classNone);

		var uploadType = document.body.querySelector('.upload-type');
		if (!uploadType) return;

		var file = 'file';
		var dirFile = 'dirfile';
		var innerDirFile = 'innerdirfile';

		var optFile = uploadType.querySelector('.' + file);
		var optDirFile = uploadType.querySelector('.' + dirFile);
		var optInnerDirFile = uploadType.querySelector('.' + innerDirFile);
		var optActive = optFile;
		var canMkdir = Boolean(optDirFile);

		function getTimeStamp() {
			var now = new Date();
			var date = String(now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate());
			var time = String(now.getHours() * 10000 + now.getMinutes() * 100 + now.getSeconds());
			var ms = String(now.getMilliseconds());
			date = date.padStart(8, '0');
			time = time.padStart(6, '0');
			ms = ms.padStart(3, '0');
			var ts = '-' + date + '-' + time + '-' + ms;
			return ts;
		}

		var itemsToFiles;
		if (location.protocol === protoHttps && typeof FileSystemHandle !== strUndef && !DataTransferItem.prototype.webkitGetAsEntry) {
			var handleKindFile = 'file';
			var handleKindDir = 'directory';
			var permDescriptor = {mode: 'read'};
			itemsToFiles = function (dataTransferItems, canMkdir) {
				function resultsToFiles(results, files, dirPath) {
					return Promise.all(results.map(function (result) {
						var handle = result.value;
						if (handle.kind === handleKindFile) {
							return handle.queryPermission(permDescriptor).then(function (queryResult) {
								if (queryResult === 'prompt') return handle.requestPermission(permDescriptor);
							}).then(function () {
								return handle.getFile();
							}).then(function (file) {
								var relativePath = dirPath + file.name;
								files.push({file: file, relativePath: relativePath});
							}).catch(function (err) {
								logError(err);
							});
						} else if (handle.kind === handleKindDir) {
							return new Promise(function (resolve) {
								var childResults = [];
								var childIter = handle.values();

								function onLevelDone() {
									childResults = null;
									childIter = null;
									resolve();
								}

								function addChildResult() {
									childIter.next().then(function (result) {
										if (result.done) {
											if (childResults.length) {
												resultsToFiles(childResults, files, dirPath + handle.name + '/').then(onLevelDone);
											} else onLevelDone();
										} else {
											childResults.push(result);
											addChildResult();
										}
									});
								}

								addChildResult();
							});
						}
					}));
				}

				var files = [];
				var hasDir = false;

				return Promise.all(Array.from(dataTransferItems).map(function (item) {
					return item.getAsFileSystemHandle();
				})).then(function (handles) {
					handles = handles.filter(Boolean);	// undefined for pasted content
					hasDir = handles.some(function (handle) {
						return handle.kind === handleKindDir;
					});
					if (hasDir && !canMkdir) {
						throw errLacksMkdir;
					}
					var handleResults = handles.map(function (handle) {
						return {value: handle, done: false};
					});
					return resultsToFiles(handleResults, files, '').then(function () {
						return {files: files, hasDir: hasDir};
					});
				});
			}
		} else {
			itemsToFiles = function (dataTransferItems, canMkdir) {
				function entriesToFiles(entries, files) {
					return Promise.all(entries.map(function (entry) {
						return new Promise(function (resolve) {
							if (entry.isFile) {
								var relativePath = entry.fullPath;
								if (relativePath[0] === '/') {
									relativePath = relativePath.slice(1);
								}
								entry.file(function (file) {
									files.push({file: file, relativePath: relativePath});
									resolve();
								}, function (err) {
									logError(err);
									resolve()
								});
							} else if (entry.isDirectory) {
								var dirReader = entry.createReader()
								var onReadSubEntries = function (subEntries) {
									if (!subEntries.length) resolve();
									entriesToFiles(subEntries, files).then(function () {
										dirReader.readEntries(onReadSubEntries);
									});
								}
								dirReader.readEntries(onReadSubEntries);
							}
						})
					}));
				}

				var entries = [];
				var files = [];
				var hasDir = false;

				for (var i = 0; i < dataTransferItems.length; i++) {
					var item = dataTransferItems[i];
					var entry = item.webkitGetAsEntry();
					if (!entry) {	// undefined for pasted text
						continue;
					}
					if (entry.isFile) {
						// Safari cannot get file from entry by entry.file(), if it is a pasted image
						// so workaround is for all browsers, just get first hierarchy of files by item.getAsFile()
						var file = item.getAsFile();
						files.push({file: file, relativePath: file.name});
					} else if (entry.isDirectory) {
						hasDir = true;
						if (canMkdir) {
							entries.push(entry);
						} else {
							return Promise.reject(errLacksMkdir);
						}
					}
				}

				return entriesToFiles(entries, files).then(function () {
					return {files: files, hasDir: hasDir};
				});
			}
		}

		function enableFileDirModeSwitch() {
			var classHidden = 'hidden';
			var classActive = 'active';

			function onClickOpt(optTarget, clearInput) {
				if (optTarget === optActive) {
					return false;
				}
				optActive.classList.remove(classActive);

				optActive = optTarget;
				optActive.classList.add(classActive);

				if (clearInput) {
					fileInput.value = '';
				}
				return true;
			}

			function onClickOptFile(e) {
				if (onClickOpt(optFile, Boolean(e))) {
					fileInput.name = file;
					fileInput.webkitdirectory = false;
				}
			}

			function onClickOptDirFile() {
				if (onClickOpt(optDirFile, optActive === optFile)) {
					fileInput.name = dirFile;
					fileInput.webkitdirectory = true;
				}
			}

			function onClickOptInnerDirFile() {
				if (onClickOpt(optInnerDirFile, optActive === optFile)) {
					fileInput.name = innerDirFile;
					fileInput.webkitdirectory = true;
				}
			}

			function onKeydownOpt(e) {
				switch (e.key) {
					case Enter:
					case Space:
						if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
							break;
						}
						e.preventDefault();
						e.stopPropagation();
						if (e.target === optActive) {
							break;
						}
						e.target.click();
						break;
				}
			}

			if (optFile) {
				optFile.addEventListener('click', onClickOptFile);
				optFile.addEventListener('keydown', onKeydownOpt);

				fileInput.addEventListener('change', function (e) {
					// workaround fix for old browsers, select dir not work but still act like select files
					// switch back to file
					if (optActive === optFile) {
						return;
					}
					var files = e.target.files;
					if (!files.length) {
						return;
					}

					var nodir = Array.prototype.slice.call(files).every(function (file) {
						return file.webkitRelativePath.indexOf('/') < 0;
					});
					if (nodir) {
						onClickOptFile();	// prevent clear input files
					}
				});
			}
			if (optDirFile) {
				optDirFile.addEventListener('click', onClickOptDirFile);
				optDirFile.addEventListener('keydown', onKeydownOpt);
			}
			if (optInnerDirFile) {
				optInnerDirFile.addEventListener('click', onClickOptInnerDirFile);
				optInnerDirFile.addEventListener('keydown', onKeydownOpt);
			}

			if (hasStorage) {
				var uploadTypeField = 'upload-type';
				var prevUploadType = sessionStorage.getItem(uploadTypeField);
				if (prevUploadType === dirFile) {
					optDirFile && optDirFile.click();
				} else if (prevUploadType === innerDirFile) {
					optInnerDirFile && optInnerDirFile.click();
				}

				if (prevUploadType !== null) {
					sessionStorage.removeItem(uploadTypeField);
				}

				window.addEventListener(leavingEvent, function () {
					var activeUploadType = fileInput.name;
					if (activeUploadType !== file) {
						sessionStorage.setItem(uploadTypeField, activeUploadType)
					}
				});
			}

			function switchToFileMode() {
				if (optFile && optActive !== optFile) {
					optFile.focus();
					onClickOptFile(true);
				}
			}

			function switchToDirMode() {
				if (optDirFile) {
					if (optActive !== optDirFile) {
						optDirFile.focus();
						onClickOptDirFile();
					}
				} else if (optInnerDirFile) {
					if (optActive !== optInnerDirFile) {
						optInnerDirFile.focus();
						onClickOptInnerDirFile();
					}
				}
			}

			return {
				switchToFileMode: switchToFileMode,
				switchToDirMode: switchToDirMode
			};
		}

		function enableUploadProgress() {	// also fix Safari upload filename has no path info
			var uploading = false;
			var batches = [];
			var classUploading = 'uploading';
			var classFailed = 'failed';
			var elUploadStatus = document.body.querySelector('.upload-status');
			var elProgress = elUploadStatus && elUploadStatus.querySelector('.progress');
			var elFailedMessage = elUploadStatus && elUploadStatus.querySelector('.warn .message');

			function onComplete() {
				if (elProgress) {
					elProgress.style.width = '';
				}
			}

			function onSuccess() {
				if (batches.length) {
					return uploadBatch(batches.shift());	// use "return" for tail call optimize
				} else {
					uploading = false;
					elUploadStatus.classList.remove(classUploading);
				}
			}

			function onFail(e) {
				elUploadStatus.classList.remove(classUploading);
				elUploadStatus.classList.add(classFailed);
				if (elFailedMessage) {
					elFailedMessage.textContent = " - " + e.type;
				}
				batches.length = 0;
			}

			function onLoad() {
				var status = this.status;
				if (status >= 200 && status <= 299) {
					!uploading && location.reload();
				} else {
					onFail({type: this.statusText || status});
				}
			}

			function onProgress(e) {
				if (e.lengthComputable) {
					var percent = 100 * e.loaded / e.total;
					elProgress.style.width = percent + '%';
				}
			}

			function uploadProgressively(files) {
				if (!files.length) {
					return;
				}

				if (uploading) {
					batches.push(files);
				} else {
					uploading = true;
					elUploadStatus.classList.remove(classFailed);
					elUploadStatus.classList.add(classUploading);
					uploadBatch(files);
				}
			}

			function uploadBatch(files) {
				var formName = fileInput.name;
				var parts = new FormData();
				files.forEach(function (file) {
					var relativePath
					if (file.file) {
						// unwrap object {file, relativePath}
						relativePath = file.relativePath;
						file = file.file;
					} else if (file.webkitRelativePath) {
						relativePath = file.webkitRelativePath
					}
					if (!relativePath) {
						relativePath = file.name;
					}

					parts.append(formName, file, relativePath);
				});

				var xhr = new XMLHttpRequest();
				xhr.addEventListener('error', onComplete);
				xhr.addEventListener('error', onFail);
				xhr.addEventListener('abort', onComplete);
				xhr.addEventListener('abort', onFail);
				xhr.addEventListener('load', onComplete);
				xhr.addEventListener('load', onSuccess);
				xhr.addEventListener('load', onLoad);
				if (elProgress) {
					xhr.upload.addEventListener('progress', onProgress);
				}

				xhr.open(form.method, form.action);
				xhr.send(parts);
			}

			return uploadProgressively;
		}

		function enableFormUploadProgress(uploadProgressively) {
			form.addEventListener('submit', function (e) {
				e.stopPropagation();
				e.preventDefault();

				var files = Array.prototype.slice.call(fileInput.files);
				uploadProgressively(files);
			});

			fileInput.addEventListener('change', function () {
				var files = Array.prototype.slice.call(fileInput.files);
				uploadProgressively(files);
			});
		}

		function enableAddDragDrop(uploadProgressively, switchToFileMode, switchToDirMode) {
			var isSelfDragging = false;
			var classDragging = 'dragging';

			function onSelfDragStart() {
				isSelfDragging = true;
			}

			function onDragEnd() {
				isSelfDragging = false;
			}

			function onDragEnterOver(e) {
				if (!isSelfDragging) {
					e.stopPropagation();
					e.preventDefault();
					e.currentTarget.classList.add(classDragging);
				}
			}

			function onDragLeave(e) {
				if (e.target === e.currentTarget) {
					e.currentTarget.classList.remove(classDragging);
				}
			}

			function onDrop(e) {
				e.stopPropagation();
				e.preventDefault();
				e.currentTarget.classList.remove(classDragging);
				fileInput.value = '';

				if (!e.dataTransfer.files.length) {
					return;
				}

				itemsToFiles(e.dataTransfer.items, canMkdir).then(function (result) {
					var files = result.files;
					if (result.hasDir) {
						switchToDirMode();
						uploadProgressively(files);
					} else {
						switchToFileMode();
						uploadProgressively(files);
					}
				}, function (err) {
					if (err === errLacksMkdir && typeof showUploadDirFailMessage !== strUndef) {
						showUploadDirFailMessage();
					}
				});
			}

			document.body.addEventListener('dragstart', onSelfDragStart);
			document.body.addEventListener('dragend', onDragEnd);
			var dragDropEl = document.documentElement;
			dragDropEl.addEventListener('dragenter', onDragEnterOver);
			dragDropEl.addEventListener('dragover', onDragEnterOver);
			dragDropEl.addEventListener('dragleave', onDragLeave);
			dragDropEl.addEventListener('drop', onDrop);
		}

		function enableAddPasteProgressively(uploadProgressively, switchToFileMode, switchToDirMode) {
			var typeTextPlain = 'text/plain';
			var nonTextInputTypes = ['hidden', 'radio', 'checkbox', 'button', 'reset', 'submit', 'image'];

			function uploadPastedFiles(files) {
				switchToFileMode();
				var ts = getTimeStamp();
				files = files.map(function (f, i) {
					var filename = f.name;
					var dotIndex = filename.lastIndexOf('.');
					if (dotIndex < 0) {
						dotIndex = filename.length;
					}
					filename = filename.substring(0, dotIndex) + ts + '-' + i + filename.substring(dotIndex);
					return {
						file: f,
						relativePath: filename
					}
				});
				uploadProgressively(files);
			}

			function generatePastedFiles(data) {
				var files;
				var items;
				if (data.files && data.files.length) {
					// pasted content is image
					files = Array.prototype.slice.call(data.files);
				} else if (data.items && data.items.length) {
					// pasted content is text
					items = Array.prototype.slice.call(data.items);
					files = items.map(function (item) {
						return item.getAsFile();
					}).filter(Boolean);
				} else {
					files = [];
				}

				if (files.length) {
					uploadPastedFiles(files);
					return;
				}

				if (!items) {
					return;
				}
				var plainTextFiles = 0;
				for (var i = 0, itemsCount = items.length; i < itemsCount; i++) {
					if (data.types[i] !== typeTextPlain) {
						continue
					}
					plainTextFiles++;
					items[i].getAsString(function (content) {
						var file = new File([content], 'text.txt', {type: typeTextPlain})
						files.push(file);
						if (files.length === plainTextFiles) {
							uploadPastedFiles(files);
						}
					});
				}
			}

			document.documentElement.addEventListener('paste', function (e) {
				var tagName = e.target.tagName;
				if (tagName === 'TEXTAREA') {
					return;
				} else if (tagName === 'INPUT' && nonTextInputTypes.indexOf(e.target.type) < 0) {
					return;
				}
				var data = e.clipboardData;

				var items = data.items;
				if (!items.length) {
					generatePastedFiles(data);
					return;
				}

				itemsToFiles(items, canMkdir).then(function (result) {
					var files = result.files;
					// for pasted text
					if (!files.length) {
						generatePastedFiles(data);
						return;
					}

					// suppose for pasted image data
					if (files.length === 1 && files[0].file.type === 'image/png') {
						files = files.map(function (fileInfo) {
							return fileInfo && fileInfo.file;
						});
						generatePastedFiles({files: files});
						return;
					}

					// pasted real files
					if (result.hasDir) {
						switchToDirMode();
					} else {
						switchToFileMode();
					}
					uploadProgressively(files);
				}, function (err) {
					if (err === errLacksMkdir && typeof showUploadDirFailMessage !== strUndef) {
						showUploadDirFailMessage();
					}
				});
			});
		}

		var modes = enableFileDirModeSwitch();
		var uploadProgressively = enableUploadProgress();
		enableFormUploadProgress(uploadProgressively);
		enableAddPasteProgressively(uploadProgressively, modes.switchToFileMode, modes.switchToDirMode);
		enableAddDragDrop(uploadProgressively, modes.switchToFileMode, modes.switchToDirMode);
	}

	function enableNonRefreshDelete() {
		var itemList = document.body.querySelector(selectorItemList);
		if (!itemList) return;
		if (!itemList.classList.contains('has-deletable')) return;

		itemList.addEventListener('submit', function (e) {
			if (e.defaultPrevented) {
				return;
			}

			var form = e.target;

			function onLoad() {
				var status = this.status;
				if (status >= 200 && status <= 299) {
					var elItem = form;
					while (elItem && elItem.nodeName !== 'LI') {
						elItem = elItem.parentElement;
					}
					if (!elItem) {
						return;
					}
					var elItemParent = elItem.parentNode;
					elItemParent && elItemParent.removeChild(elItem);
				} else {
					logError('delete failed: ' + status + ' ' + this.statusText);
				}
			}

			var params = '';
			var els = Array.prototype.slice.call(form.elements);
			for (var i = 0, len = els.length; i < len; i++) {
				if (!els[i].name) {
					continue
				}
				if (params.length > 0) {
					params += '&'
				}
				params += els[i].name + '=' + encodeURIComponent(els[i].value)
			}
			var url = form.action;

			var xhr = new XMLHttpRequest();
			xhr.open('POST', url);	// will retrieve deleted result into bfcache
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.addEventListener('load', onLoad);
			xhr.send(params);
			e.preventDefault();
			return false;
		}, false);
	}

	enableFilter();
	keepFocusOnBackwardForward();
	focusChildOnNavUp();
	enableKeyboardNavigate();
	enhanceUpload();
	enableNonRefreshDelete();
}());
