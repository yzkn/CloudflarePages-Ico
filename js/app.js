// Copyright (c) 2026 YA All rights reserved.


const apiUri = 'list.json';
const DEFAULT_SIZE = 512;
const GITHUB_BASEURL = 'https://raw.githubusercontent.com/';

// 出典で絞り込むチップ: 選んだ出典のキー（空なら、すべて）
let selectedSources = new Set();

// path（URL）から出典のキーを作る。GitHub は「所有者/リポジトリ」、npm（jsDelivr）はパッケージ、ほかはホスト
const sourceKey = path => {
    let url;
    try {
        url = new URL(path);
    } catch (error) {
        return path.split('/')[0];
    }
    const parts = url.pathname.split('/').filter(x => x);
    if (url.host === 'raw.githubusercontent.com' && parts.length >= 2) {
        return parts[0] + '/' + parts[1];
    }
    if (url.host === 'cdn.jsdelivr.net' && parts[0] === 'npm' && parts.length >= 2) {
        return 'npm:' + (parts[1].startsWith('@') && parts.length >= 3 ? parts[1] + '/' + parts[2] : parts[1]);
    }
    return url.host;
};

// チップに出す名前: リポジトリ名・パッケージ名（版を除く）・ホストの先頭（全体はツールチップ）
// リポジトリ名が汎用（icons など）で見分けにくいときは、所有者の名前を使う
const genericRepoNames = ['icon', 'icons', 'homepage'];
const sourceLabel = key => {
    if (key.startsWith('npm:')) {
        return key.split('/').pop().replace(/(.)@.*$/, '$1');
    }
    if (key.includes('/')) {
        const [owner, repo] = key.split('/');
        return genericRepoNames.includes(repo.toLowerCase()) ? owner : repo;
    }
    return key.split('.')[0];
};

const renderSourceFilter = (counts, total, term, ignore_case) => {
    const container = document.getElementById('source-filter');
    container.innerHTML = '';

    const makeChip = (label, title, count, active, onClick) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.classList.add('btn', 'btn-sm', 'rounded-pill', 'text-nowrap', active ? 'btn-secondary' : 'btn-outline-secondary');
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        chip.title = title;
        chip.innerText = label + ' ' + count;
        chip.addEventListener('click', onClick);
        container.appendChild(chip);
    };

    makeChip('すべて', '出典で絞り込まない', total, selectedSources.size === 0, () => {
        selectedSources.clear();
        parseJson(term, ignore_case);
    });
    Object.keys(counts)
        .sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b), 'ja'))
        .forEach(key => {
            makeChip(sourceLabel(key), key.replace(/^npm:/, 'npm: '), counts[key], selectedSources.has(key), () => {
                if (selectedSources.has(key)) {
                    selectedSources.delete(key);
                } else {
                    selectedSources.add(key);
                }
                parseJson(term, ignore_case);
            });
        });

    container.classList.toggle('d-none', Object.keys(counts).length === 0);
};

let queries;
let toastDict;

let stored = null;

const basename = path => path.split('/').pop().split('.').shift();

const retrieveQueryDict = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    return Object.fromEntries(urlSearchParams.entries());
};

// 検索の条件を URL に書き戻す（?term=…&ic=t&ts=…）。履歴は増やさない。既定の値は書かない。ほかの引数（conn など）は残す
const updateQueryString = () => {
    const params = new URLSearchParams(window.location.search);
    const term = document.getElementById('icon-search-term').value.trim();
    const ignoreCase = document.getElementById('icon-search-ignorecase').checked;
    const ts = document.getElementById('icon-copy-transparent-select').value;
    term !== '' ? params.set('term', term) : params.delete('term');
    ignoreCase ? params.set('ic', 't') : params.delete('ic');
    ts !== 'none' ? params.set('ts', ts) : params.delete('ts');
    const query = params.toString();
    const next = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
        history.replaceState(history.state, '', next);
    }
};

const showSpinner = () => {
    document.getElementById('icon-search-spinner').classList.remove('spinner-hidden');
    document.getElementById('icon-search').disabled = true;
};

const hideSpinner = () => {
    document.getElementById('icon-search-spinner').classList.add('spinner-hidden');
    document.getElementById('icon-search').disabled = false;
};

const loadDataSource = () => {
    const items = [
        {
            "url": "https://github.com/Vectopus/Atlas-icons-font",
            "name": "Atlas icons"
        },
        {
            "url": "https://icons.getbootstrap.com",
            "name": "Bootstrap Icons"
        },
        {
            "url": "https://github.com/atisawd/boxicons",
            "name": "Boxicons"
        },
        {
            "url": "https://github.com/alrra/browser-logos",
            "name": "Browser Logos"
        },
        {
            "url": "https://github.com/danklammer/bytesize-icons",
            "name": "Bytesize Icons"
        },
        {
            "url": "https://github.com/Klarr-Agency/Circum-icons",
            "name": "Circum Icons"
        },
        {
            "url": "https://github.com/AllienWorks/cryptocoins",
            "name": "Cryptocoins"
        },
        {
            "url": "https://github.com/spothq/cryptocurrency-icons",
            "name": "Cryptocurrency Icons"
        },
        {
            "url": "https://github.com/astrit/css.gg target=",
            "name": "css.gg"
        },
        {
            "url": "https://github.com/devicons/devicon",
            "name": "Devicon"
        },
        {
            "url": "https://github.com/vorillaz/devicons",
            "name": "Devicons"
        },
        {
            "url": "https://github.com/akveo/eva-icons",
            "name": "Eva Icons"
        },
        {
            "url": "https://github.com/evil-icons/evil-icons#readme",
            "name": "Evil icons"
        },
        {
            "url": "https://github.com/feathericons/feather",
            "name": "Feather"
        },
        {
            "url": "https://github.com/madebybowtie/FlagKit",
            "name": "FlagKit"
        },
        {
            "url": "https://github.com/microsoft/fluentui-system-icons",
            "name": "Fluent System Icons"
        },
        {
            "url": "https://github.com/FortAwesome/Font-Awesome",
            "name": "Font Awesome"
        },
        {
            "url": "https://github.com/refactoringui/heroicons#readme",
            "name": "Heroicons"
        },
        {
            "url": "https://github.com/zraly/humbleicons",
            "name": "Humbleicons"
        },
        {
            "url": "https://github.com/iconoir-icons/iconoir",
            "name": "Iconoir"
        },
        {
            "url": "https://github.com/bytedance/IconPark",
            "name": "IconPark"
        },
        {
            "url": "https://github.com/lusaxweb/iconsax",
            "name": "Iconsax"
        },
        {
            "url": "https://github.com/ionic-team/ionicons",
            "name": "Ionicons"
        },
        {
            "url": "https://github.com/mikolajdobrucki/ikonate",
            "name": "Ikonate"
        },
        {
            "url": "https://github.com/icons8/line-awesome",
            "name": "Line Awesome"
        },
        {
            "url": "https://github.com/lucide-icons/lucide",
            "name": "Lucide"
        },
        {
            "url": "https://fonts.google.com/icons",
            "name": "Material Symbols"
        },
        {
            "url": "https://github.com/Richard9394/MingCute",
            "name": "MingCute Icon"
        },
        {
            "url": "https://github.com/mono-company/mono-icons",
            "name": "Mono Icons"
        },
        {
            "url": "https://github.com/primer/octicons",
            "name": "Octicons"
        },
        {
            "url": "https://github.com/iconic/open-iconic",
            "name": "Open Iconic"
        },
        {
            "url": "https://github.com/hfg-gmuend/openmoji",
            "name": "OpenMoji"
        },
        {
            "url": "https://github.com/yne/picon",
            "name": "Pico-icon"
        },
        {
            "url": "https://github.com/phosphor-icons/homepage",
            "name": "Phosphor Icons"
        },
        {
            "url": "https://github.com/radix-ui/icons",
            "name": "Radix Icons"
        },
        {
            "url": "https://github.com/Remix-Design/RemixIcon",
            "name": "Remix Icon"
        },
        {
            "url": "https://github.com/planetabhi/sargam-icons",
            "name": "Sargam Icons"
        },
        {
            "url": "https://github.com/simple-icons/simple-icons",
            "name": "Simple Icons"
        },
        {
            "url": "https://github.com/danylpo/skware",
            "name": "Skware"
        },
        {
            "url": "https://github.com/lachlanjc/supercons",
            "name": "Supercons"
        },
        {
            "url": "https://github.com/tabler/tabler-icons",
            "name": "Tabler Icons"
        },
        {
            "url": "https://github.com/teenyicons/teenyicons",
            "name": "Teenyicons"
        },
        {
            "url": "https://github.com/iconscout/unicons",
            "name": "Unicons"
        },
        {
            "url": "https://github.com/VectorLogoZone/vectorlogozone",
            "name": "Vector Logo Zone"
        },
        {
            "url": "https://github.com/microsoft/vscode-icons",
            "name": "Visual Studio Code Icons"
        },
        {
            "url": "https://github.com/erikflowers/weather-icons",
            "name": "Weather Icons"
        },
        {
            "url": "https://www.digital.go.jp/policies/servicedesign/designsystem/Illustration_Icons/",
            "name": "Digital Agency"
        },
        {
            "url": "https://pixeliconlibrary.com/",
            "name": "Pixel Icon Library"
        }
    ];

    const datasourceList = document.getElementById('datasource-list');
    items.sort((a, b) => a.name > b.name ? 1 : -1).forEach(item => {
        let datasourceItem = document.createElement('div');
        datasourceItem.classList.add('list-group');
        datasourceItem.innerHTML = '<a href="' + item.url + '" target="_blank" class="list-group-item list-group-item-light"> ' + item.name + '</a>';
        datasourceList.appendChild(datasourceItem);
    });
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
            const item = element.path.replace(GITHUB_BASEURL, '').replaceAll('/', ' ').replace('.png', '').replace('.svg', '');
            const ssv = item.split(' ');
            option.value = ssv[0] + (ssv[0] == ssv[1] ? '' : ' ' + ssv[1]) + ' ' + ssv[ssv.length - 1];
            searchList.appendChild(option);
        });
    }
};

const imgOnclick = (canvas, element, eventCtrlKey, eventShiftKey, img) => {
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

// 検索の結果は、並び順どおりに pageSize 件ずつ置く（当たった全件の画像を一度に要求しない）
const pageSize = 200;
// 検索の世代。新しい検索を始めたら、前の検索の画像の読み込みの知らせは数えない
let searchGeneration = 0;

// 結果の下の「さらに表示」のボタン。残りが無ければ消す
const updateMoreButton = (remaining, onClick) => {
    let more = document.getElementById('image-more');
    if (remaining <= 0) {
        if (more) {
            more.remove();
        }
        return;
    }
    if (!more) {
        more = document.createElement('button');
        more.id = 'image-more';
        more.type = 'button';
        more.classList.add('btn', 'btn-outline-secondary', 'd-block', 'mx-auto', 'my-3');
        document.getElementById('image-list').after(more);
    }
    more.innerText = 'さらに表示（残り ' + remaining + ' 件）';
    more.onclick = onClick;
};

const parseJson = (term = '', ignore_case = false) => {
    if (stored == null) {
        setTimeout(() => {
            parseJson(term, ignore_case);
        }, 500);
    } else {
        showSpinner();
        const generation = ++searchGeneration;
        updateQueryString();

        let imageList = document.getElementById('image-list');
        imageList.innerHTML = '';
        updateMoreButton(0);

        let filtered = stored.tree.filter((element) => {
            return ignore_case
                ?
                term.toLowerCase()
                    .split(/\s+/)
                    .map(t => element.path.replace(GITHUB_BASEURL, '').toLowerCase().includes(t) || element.description.toLowerCase().includes(t))
                    .every(t => t === true)
                :
                term.split(/\s+/)
                    .map(t => element.path.replace(GITHUB_BASEURL, '').includes(t) || element.description.includes(t))
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

        // 出典ごとの件数（チップに出す）。キーワードで絞ったあと、出典で絞る前の数
        const counts = {};
        filtered.forEach(element => {
            const key = sourceKey(element.path);
            counts[key] = (counts[key] || 0) + 1;
        });
        // 今回の結果に無い出典の選択は外す（チップが消えて外せなくなるため）
        selectedSources.forEach(key => {
            if (!counts[key]) {
                selectedSources.delete(key);
            }
        });
        renderSourceFilter(counts, filtered.length, term, ignore_case);

        if (selectedSources.size > 0) {
            filtered = filtered.filter(element => selectedSources.has(sourceKey(element.path)));
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

            // 置いた件数と、そのうち画像の読み込みが終わった（失敗も含む）件数
            let rendered = 0;
            let elementsProcessed = 0;
            const countProcessed = () => {
                if (generation !== searchGeneration) {
                    return;
                }
                elementsProcessed++;
                if (elementsProcessed === rendered) {
                    hideSpinner();
                }
            };
            // 1 件分の枠を作る。枠は先に並び順どおりに置き、画像は読み込めたら枠に入れる
            const renderBox = element => {
                // 最初の読み込みの成否を 1 回だけ数える（クリックで src を差し替えたときに数え直さない）
                let settled = false;
                let box = document.createElement('div');
                box.classList.add('position-relative');
                box.height = 64;
                box.width = 64;
                box.style.minWidth = '64px';
                box.style.minHeight = '64px';

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

                            //

                            const tsCondition = document.getElementById('icon-copy-transparent-select').value;
                            if (tsCondition == 'lightgray-to-transparent') {
                                ctx.drawImage(img, 0, 0);
                                const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                const data = imagedata.data;
                                for (let i = 0; i < canvas.width * canvas.height * 4; i += 4) {
                                    if (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240 && data[i] === data[i + 1] && data[i + 1] === data[i + 2]) {
                                        // data[i] = 0;
                                        // data[i + 1] = 0;
                                        // data[i + 2] = 0;
                                        data[i + 3] = 0; // アルファ値を0にして透明にする
                                    }
                                }
                                ctx.putImageData(imagedata, 0, 0);
                            } else if (tsCondition == 'white-to-transparent') {
                                ctx.drawImage(img, 0, 0);
                                const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                const data = imagedata.data;
                                for (let i = 0; i < canvas.width * canvas.height * 4; i += 4) {
                                    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                                        data[i + 3] = 0; // アルファ値を0にして透明にする
                                    }
                                }
                                ctx.putImageData(imagedata, 0, 0);
                            } else if (tsCondition == 'white-background') {
                                ctx.beginPath();
                                ctx.fillStyle = 'white';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0);
                            } else if (tsCondition == 'none') {
                                ctx.drawImage(img, 0, 0);
                            }

                            // ctx.beginPath();
                            // ctx.fillStyle = 'white';
                            // ctx.fillRect(0, 0, canvas.width, canvas.height);
                            // ctx.drawImage(img, 0, 0);

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
                                        //

                                        const tsCondition = document.getElementById('icon-copy-transparent-select').value;
                                        if (tsCondition == 'lightgray-to-transparent') {
                                            ctx.drawImage(img, 0, 0);
                                            const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const data = imagedata.data;
                                            for (let i = 0; i < canvas.width * canvas.height * 4; i += 4) {
                                                if (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240 && data[i] === data[i + 1] && data[i + 1] === data[i + 2]) {
                                                    // data[i] = 0;
                                                    // data[i + 1] = 0;
                                                    // data[i + 2] = 0;
                                                    data[i + 3] = 0; // アルファ値を0にして透明にする
                                                }
                                            }
                                            ctx.putImageData(imagedata, 0, 0);
                                        } else if (tsCondition == 'white-to-transparent') {
                                            ctx.drawImage(img, 0, 0);
                                            const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const data = imagedata.data;
                                            for (let i = 0; i < canvas.width * canvas.height * 4; i += 4) {
                                                if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                                                    data[i + 3] = 0; // アルファ値を0にして透明にする
                                                }
                                            }
                                            ctx.putImageData(imagedata, 0, 0);
                                        } else if (tsCondition == 'white-background') {
                                            ctx.beginPath();
                                            ctx.fillStyle = 'white';
                                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                                            ctx.drawImage(img, 0, 0);
                                        } else if (tsCondition == 'none') {
                                            ctx.drawImage(img, 0, 0);
                                        }

                                        // ctx.beginPath();
                                        // ctx.fillStyle = 'white';
                                        // ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        // ctx.drawImage(img, 0, 0);

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
                    if (settled) {
                        return;
                    }
                    settled = true;
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    const imgSize = (width > 0 && height > 0) ? String(width) + 'x' + String(height) : '';

                    let captionBox = document.createElement('div');
                    captionBox.classList.add('position-absolute');
                    captionBox.classList.add('w-100');
                    // 名前を枠の下に出すので、寸法は画像の下端に合わせる
                    captionBox.style.top = '64px';
                    captionBox.style.transform = 'translateY(-100%)';

                    let captionLabel = document.createElement('p');
                    captionLabel.classList.add('m-0');
                    captionLabel.classList.add('px-1');
                    captionLabel.classList.add('small');
                    captionLabel.classList.add('text-end');
                    captionLabel.classList.add('text-light');
                    captionLabel.innerHTML = ((img.src).endsWith('.svg') ? 'SVG' : 'PNG') + (imgSize == '' ? '' : '<br>' + imgSize);
                    captionLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    captionLabel.style.fontSize = '10px';

                    let nameBox = document.createElement('div');
                    nameBox.classList.add('w-100');

                    // 名前は枠の下に 1 行で出す（長いものは省略記号。全体はツールチップ）
                    let nameLabel = document.createElement('p');
                    nameLabel.classList.add('m-0');
                    nameLabel.classList.add('px-1');
                    nameLabel.classList.add('text-center');
                    nameLabel.classList.add('text-truncate');
                    nameLabel.classList.add('text-body');
                    nameLabel.innerText = basename(element.path);
                    nameLabel.title = basename(element.path);
                    nameLabel.style.fontSize = '11px';

                    box.appendChild(img);
                    captionBox.appendChild(captionLabel);
                    box.appendChild(captionBox);
                    nameBox.appendChild(nameLabel);
                    box.appendChild(nameBox);

                    countProcessed();
                }

                img.onerror = () => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    // 読み込めない画像も完了に数える（数えないとスピナー・検索ボタンが戻らない）
                    let failedBox = document.createElement('div');
                    failedBox.classList.add('img-thumbnail');
                    failedBox.classList.add('d-flex');
                    failedBox.classList.add('align-items-center');
                    failedBox.classList.add('justify-content-center');
                    failedBox.classList.add('text-center');
                    failedBox.classList.add('text-secondary');
                    failedBox.style.width = '64px';
                    failedBox.style.height = '64px';
                    failedBox.style.fontSize = '10px';
                    failedBox.innerText = '読み込めません';
                    failedBox.title = element.path + "\n---\n" + element.description + "\n（画像を読み込めませんでした）";

                    box.appendChild(failedBox);

                    countProcessed();
                };

                img.alt = element.path;
                img.className = 'img-thumbnail';
                img.crossOrigin = 'anonymous';
                img.title = element.path + "\n---\n" + element.description + "\n（クリック：ファイルをDL / Ctrl + クリック：画像をコピー / Shift + クリック：文字列をコピー）";
                img.src = element.path;
                return box;
            };
            const renderPage = () => {
                const fragment = document.createDocumentFragment();
                const page = sorted.slice(rendered, rendered + pageSize);
                rendered += page.length;
                page.forEach(element => {
                    fragment.appendChild(renderBox(element));
                });
                imageList.appendChild(fragment);
                updateMoreButton(sorted.length - rendered, () => {
                    showSpinner();
                    renderPage();
                });
            };
            renderPage();
        }
    }
};

window.addEventListener('DOMContentLoaded', _ => {
    loadDataSource();
    loadJson();

    document.getElementById('icon-search-ignorecase').addEventListener('change', _ => {
        const checked = document.getElementById('icon-search-ignorecase').checked;
        document.getElementById('icon-search-ignorecase-label').innerText = "大文字/小文字を区別"
            + (checked ? "しない" : "する");
        updateQueryString();
    });
    // コピーの設定（透明の扱い）も URL に残す
    document.getElementById('icon-copy-transparent-select').addEventListener('change', updateQueryString);

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

    // クエリパラメーターをもとに設定: icon-search-ignorecase
    let ic = retrieveQueryDict()['ic'];
    if (ic) {
        if (ic == 't') {
            document.getElementById('icon-search-ignorecase').checked = true;
            document.getElementById('icon-search-ignorecase-label').innerText = "大/小文字を区別しない";
        }
    }

    // クエリパラメーターをもとに設定: icon-copy-transparent-select
    let ts = retrieveQueryDict()['ts'];
    if (ts) {
        if (ts == 'none' || ts == 'white-to-transparent' || ts == 'white-background' || ts == 'lightgray-to-transparent') {
            let optionElement = document.getElementById('icon-copy-transparent-select').querySelector('option[value="' + ts + '"]');
            optionElement.selected = true;
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
