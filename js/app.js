// Copyright (c) 2023 YA All rights reserved.


const apiUri = 'list.json';
const DEFAULT_SIZE = 512;

let queries;
let toastDict;

let stored = null;

const basename = path =>
    path.split('/').pop().split('.').shift();

const retrieveQueryDict = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    return Object.fromEntries(urlSearchParams.entries());
};

const showSpinner = () => {
    document.getElementById('icon-search-spinner').classList.remove('spinner-hidden');
    document.getElementById('icon-search').disabled = true;
};

const hideSpinner = () => {
    document.getElementById('icon-search-spinner').classList.add('spinner-hidden');
    document.getElementById('icon-search').disabled = false;
};

const loadJson = (term = '', ignore_case = false) => {
    if (stored == null) {
        fetch(apiUri)
            .then(response => response.json())
            .then(json => {
                stored = json;
                initAutocomplete();
            });
    }
};

const initAutocomplete = () => {
    if (stored != null) {
        const searchList = document.getElementById('search-list');
        const treeItems = stored.tree;
        treeItems.forEach(element => {
            const option = document.createElement('option');
            const item = element.path.replace('https://raw.githubusercontent.com/', '').replaceAll('/', ' ').replace('.png', '').replace('.svg', '');
            const ssv = item.split(' ');
            option.value = ssv[0] + (ssv[0] == ssv[1] ? '' : ' ' + ssv[1]) + ' ' + ssv[ssv.length - 1];
            searchList.appendChild(option);
        });
    }
};

const imgOnclick = (canvas, element, eventCtrlKey, eventShiftKey, img) => {
    console.log('imgOnclick()', canvas, element, eventCtrlKey, eventShiftKey, img);
    const dataURL = canvas.toDataURL("image/png");

    if (eventCtrlKey && ((img.src).endsWith('.png') || (img.src).startsWith('data:image/png;base64,'))) {
        // PNG形式の画像をクリップボードにコピー
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({
                    'image/png': blob
                });
                await navigator.clipboard.write([item]);
                toastDict['toast-copied-png'].show();
            } catch (error) {
                if (error.message == 'ClipboardItem is not defined') {
                    toastDict['toast-clipboard-item'].show();
                }
            }
        });
    } else if (eventCtrlKey && ((img.src).endsWith('.svg') || (img.src).startsWith('data:image/svg+xml;base64,'))) {
        // SVGから変換したPNG形式の画像をクリップボードにコピー
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({
                    'image/png': blob
                });
                await navigator.clipboard.write([item]);
                toastDict['toast-copied-png'].show();
            } catch (error) {
                if (error.message == 'ClipboardItem is not defined') {
                    toastDict['toast-clipboard-item'].show();
                }
            }
        });
    } else if (eventShiftKey && ((img.src).endsWith('.png') || (img.src).startsWith('data:image/png;base64,'))) {
        // PNG形式のData URL
        try {
            const blob = new Blob([dataURL], { type: 'text/plain' })
            const item = new ClipboardItem({ 'text/plain': blob });
            navigator.clipboard.write([item]);
            toastDict['toast-copied-dataurl'].show();
        } catch (error) {
            if (error.message == 'ClipboardItem is not defined') {
                toastDict['toast-clipboard-item'].show();
            }
        }
    } else if (eventShiftKey && ((img.src).endsWith('.svg') || (img.src).startsWith('data:image/svg+xml;base64,'))) {
        // SVGのソース
        fetch(img.src)
            .then(function (response) {
                return response.text();
            }).then(async (svg) => {
                try {
                    const blob = new Blob([svg], { type: 'text/plain' });
                    const item = new ClipboardItem({ 'text/plain': blob });
                    await navigator.clipboard.write([item]);
                    toastDict['toast-copied-svg'].show();
                } catch (error) {
                    if (error.message == 'ClipboardItem is not defined') {
                        toastDict['toast-clipboard-item'].show();
                    }
                }
            })
    } else {
        // PNGファイルダウンロード
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.setAttribute('download', basename(element.path) + '.png');
        a.dispatchEvent(new MouseEvent('click'));
    }
};

const parseJson = (term = '', ignore_case = false) => {
    if (stored == null) {
        setTimeout(() => {
            parseJson(term, ignore_case);
        }, 500);
    } else {
        showSpinner();

        let imageList = document.getElementById('image-list');
        imageList.innerHTML = '';

        let filtered = stored.tree.filter((element) => {
            return ignore_case
                ?
                term.toLowerCase()
                    .split(/\s+/)
                    .map(t => element.path.toLowerCase().includes(t))
                    .every(t => t === true)
                :
                term.split(/\s+/)
                    .map(t => element.path.includes(t))
                    .every(t => t === true)
        });

        let conn = retrieveQueryDict()['conn'];
        if (conn) {
            if (conn == 't') {
                console.log('conn');
            } else {
                filtered = filtered.filter((element) => {
                    return (!element.path.includes('asset/Power_Platform_Connector/'));
                });
            }
        } else {
            filtered = filtered.filter((element) => {
                return (!element.path.includes('asset/Power_Platform_Connector/'));
            });
        }
        if (filtered.length == 0) {
            hideSpinner();
        } else {
            const sorted = filtered.sort((a, b) => {
                const na = a.path.toUpperCase();
                const nb = b.path.toUpperCase();
                if (na < nb) {
                    return -1;
                } else if (na > nb) {
                    return 1;
                } else {
                    return 0;
                }
            });

            let elementsProcessed = 0;
            sorted.forEach(element => {
                let box = document.createElement('div');
                box.classList.add('position-relative');
                box.height = 64;
                box.width = 64;

                let img = document.createElement('img');
                img.onclick = (event) => {
                    const img = event.target;
                    const eventCtrlKey = event.ctrlKey, eventShiftKey = event.shiftKey;

                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;

                            const ctx = canvas.getContext('2d');
                            ctx.beginPath();
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);

                            imgOnclick(canvas, element, eventCtrlKey, eventShiftKey, img);
                        } catch (error) {
                            console.error(error);
                        }
                    } else {
                        // Firefoxで幅・高さが指定されていないSVGファイルが描画されないバグを回避
                        fetch(img.src)
                            .then(function (response) {
                                return response.text();
                            }).then(async (svg) => {
                                try {
                                    const parser = new DOMParser();
                                    const result = parser.parseFromString(svg, 'text/xml');
                                    const svgElem = result.getElementsByTagName("svg")[0];
                                    svgElem.setAttribute('width', DEFAULT_SIZE + 'px');
                                    svgElem.setAttribute('height', DEFAULT_SIZE + 'px');
                                    const encoded = btoa(new XMLSerializer().serializeToString(svgElem));

                                    img.onload = function () {
                                        const canvas = document.createElement("canvas");
                                        canvas.width = img.naturalWidth;
                                        canvas.height = img.naturalHeight;

                                        const ctx = canvas.getContext("2d");
                                        ctx.beginPath();
                                        ctx.fillStyle = 'white';
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        ctx.drawImage(img, 0, 0);

                                        imgOnclick(canvas, element, eventCtrlKey, eventShiftKey, img);
                                    };

                                    img.src = 'data:image/svg+xml;base64,' + encoded;
                                } catch (error) {
                                    console.error(error);
                                }
                            })
                    }
                };

                img.onload = () => {
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    const imgSize = (width > 0 && height > 0) ? String(width) + 'x' + String(height) : '';

                    let captionBox = document.createElement('div');
                    captionBox.classList.add('position-absolute');
                    captionBox.classList.add('bottom-0');
                    captionBox.classList.add('w-100');

                    let captionLabel = document.createElement('p');
                    captionLabel.classList.add('m-0');
                    captionLabel.classList.add('px-1');
                    captionLabel.classList.add('text-end');
                    captionLabel.classList.add('text-light');
                    captionLabel.innerText = ((img.src).endsWith('.svg') ? 'SVG' : 'PNG') + (imgSize == '' ? '' : ' ' + imgSize);
                    captionLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    captionLabel.style.fontSize = '10px';

                    box.appendChild(img);
                    captionBox.appendChild(captionLabel);
                    box.appendChild(captionBox);
                    imageList.appendChild(box);

                    elementsProcessed++;
                    if (elementsProcessed === sorted.length) {
                        hideSpinner();
                    }
                }

                img.alt = element.path;
                img.className = 'img-thumbnail';
                img.crossOrigin = 'anonymous';
                img.title = basename(element.path);
                img.src = element.path;
            });
        }
    }
};

window.addEventListener('DOMContentLoaded', _ => {
    loadJson();

    document.querySelectorAll('.alert').forEach((alert) => new bootstrap.Alert(alert));
    toastDict = {
        'toast-copied-dataurl': new bootstrap.Toast(document.getElementById('toast-copied-dataurl'), {
            delay: 500,
        }),
        'toast-copied-png': new bootstrap.Toast(document.getElementById('toast-copied-png'), {
            delay: 500,
        }),
        'toast-copied-svg': new bootstrap.Toast(document.getElementById('toast-copied-svg'), {
            delay: 500,
        }),
        'toast-input-keyword': new bootstrap.Toast(document.getElementById('toast-input-keyword'), {
            delay: 10000,
        })
    };

    let ic = retrieveQueryDict()['ic'];
    if (ic) {
        if (ic == 't') {
            document.getElementById('icon-search-ignorecase').checked = true;
        }
    }

    let term = retrieveQueryDict()['term'];
    if (term) {
        document.getElementById('icon-search-term').value = term;

        parseJson(
            term,
            document.getElementById('icon-search-ignorecase').checked
        );
    } else {
        toastDict['toast-input-keyword'].show();
    }

    document.getElementById('icon-search').addEventListener('click', _ => {
        parseJson(
            document.getElementById('icon-search-term').value,
            document.getElementById('icon-search-ignorecase').checked
        );
    });

    document.getElementById('icon-search-term').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('icon-search').dispatchEvent(new Event('click'));
        }
    });
});
