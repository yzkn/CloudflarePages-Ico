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

// 大文字・小文字の切り替えの文言（どこで切り替えても同じ表記にする。スイッチを入れると「区別しない」）
const updateIgnoreCaseLabel = () => {
    const checked = document.getElementById('icon-search-ignorecase').checked;
    document.getElementById('icon-search-ignorecase-label').innerText = '大文字/小文字を区別' + (checked ? 'しない' : 'する');
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
            "url": "https://github.com/astrit/css.gg",
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

// list.json は { prefixes: [出典の前置き...], tree: [[出典の番号, path の残り, 説明], ...] }（src/compact-list.py が作る）。
// 古い形 { tree: [{ path, description }, ...] } もそのまま読む
const expandList = json => {
    if (!Array.isArray(json.prefixes)) {
        return json;
    }
    const prefixes = json.prefixes;
    return { tree: json.tree.map(([i, rest, description]) => ({ path: prefixes[i] + rest, description })) };
};

// 検索用の索引（初回に 1 回だけ作る）。並び順（path の大文字で比べた順）に並べておき、
// 各件の「GitHub の前置きを除いた path」と description をつないだ文字列（そのままと小文字）と、出典のキーを前もって持つ
let searchIndex = null;
// 補完の候補（重複を除いたもの）
let suggestions = [];
// list.json の取得は 1 回だけ（打つたびの検索で、読み込み中に何度も取得しない）
let loading = null;

const CONNECTOR_PATH = 'asset/Power_Platform_Connector/';

const buildIndex = () => {
    const compare = (a, b) => a.upper < b.upper ? -1 : (a.upper > b.upper ? 1 : 0);
    searchIndex = stored.tree
        .map(element => {
            const text = element.path.replace(GITHUB_BASEURL, '') + '\n' + element.description;
            return {
                element,
                text,
                lower: text.toLowerCase(),
                source: sourceKey(element.path),
                connector: element.path.includes(CONNECTOR_PATH),
                upper: element.path.toUpperCase(),
            };
        })
        .sort(compare);

    const seen = new Set();
    stored.tree.forEach(element => {
        const ssv = element.path.replace(GITHUB_BASEURL, '').replaceAll('/', ' ').replace('.png', '').replace('.svg', '').split(' ');
        const value = ssv[0] + (ssv[0] == ssv[1] ? '' : ' ' + ssv[1]) + ' ' + ssv[ssv.length - 1];
        if (!seen.has(value)) {
            seen.add(value);
            suggestions.push({ value, lower: value.toLowerCase() });
        }
    });
};

const ensureLoaded = () => {
    if (loading == null) {
        loading = fetch(apiUri)
            .then(response => response.json())
            .then(json => {
                stored = expandList(json);
                buildIndex();
                updateSuggestions(document.getElementById('icon-search-term').value);
            })
            .catch(error => {
                loading = null; // 次の検索で取り直す
                hideSpinner();
                throw error;
            });
    }
    return loading;
};

// 起動時に読み込みを始める（索引も作る）
const loadJson = () => {
    ensureLoaded().catch(error => console.error(error));
};

// 補完の候補: 2 文字以上になってから、当たるもの（前方一致を先に）の上位 suggestionLimit 件だけを置く
const suggestionLimit = 50;
const updateSuggestions = value => {
    const searchList = document.getElementById('search-list');
    searchList.innerHTML = '';
    const v = value.trim().toLowerCase();
    if (v.length < 2 || searchIndex == null) {
        return;
    }
    const prefix = [];
    const contains = [];
    for (const s of suggestions) {
        if (s.lower.startsWith(v)) {
            prefix.push(s.value);
            if (prefix.length >= suggestionLimit) {
                break;
            }
        } else if (contains.length < suggestionLimit && s.lower.includes(v)) {
            contains.push(s.value);
        }
    }
    const fragment = document.createDocumentFragment();
    prefix.concat(contains).slice(0, suggestionLimit).forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        fragment.appendChild(option);
    });
    searchList.appendChild(fragment);
};

// 当たった件数の表示
const showResultCount = count => {
    const label = document.getElementById('result-count');
    if (count == null) {
        label.innerText = '';
        label.classList.add('d-none');
    } else {
        label.innerText = count + ' 件';
        label.classList.remove('d-none');
    }
};

// 知らせ: 成功（緑）と失敗（黄）。文言は場面ごとに入れ替える
const showCopied = message => {
    document.getElementById('toast-copied-body').innerText = message;
    toastDict['toast-copied'].show();
};
const showFailed = message => {
    document.getElementById('toast-failed-body').innerText = message;
    toastDict['toast-failed'].show();
};

// ClipboardItem（画像のコピーに使う）が無いブラウザーがある
const hasClipboardItem = () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard && typeof navigator.clipboard.write === 'function';

// SVG の画像か（Firefox の回避で src を data: の SVG に差し替えたときも含む）
const isSvg = (img, element) => element.path.endsWith('.svg') || img.src.endsWith('.svg') || img.src.startsWith('data:image/svg+xml;base64,');

// Blob をファイルとして保存する
const saveBlob = (blob, name) => {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
};

// SVG を元のファイルのまま保存する（PNG に変えない）
const saveSvg = element => {
    fetch(element.path)
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.blob();
        })
        .then(blob => saveBlob(blob, basename(element.path) + '.svg'))
        .catch(error => {
            console.error(error);
            showFailed('SVG を保存できませんでした（' + error.message + '）。');
        });
};

// 画像（PNG）をコピーする。Safari はクリックの中で write を呼ぶ必要があるので、Blob の Promise を渡す
const copyPng = canvas => {
    if (!hasClipboardItem()) {
        toastDict['toast-clipboard-item'].show();
        return;
    }
    const blobPromise = new Promise((resolve, reject) => {
        try {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG にできませんでした')), 'image/png');
        } catch (error) {
            // 画像の読み込み元が CORS を許していないと、canvas から取り出せない
            reject(error);
        }
    });
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
        .then(() => showCopied('PNG画像をクリップボードにコピーしました。'))
        .catch(error => {
            console.error(error);
            showFailed('画像をコピーできませんでした（' + error.message + '）。');
        });
};

// 文字列をコピーする。ClipboardItem が無ければ writeText で行う
const copyText = (textPromise, message) => {
    const text = Promise.resolve(textPromise);
    let done;
    if (hasClipboardItem()) {
        done = navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then(t => new Blob([t], { type: 'text/plain' })) })])
            .catch(error => {
                // ClipboardItem に Promise を渡せないブラウザーもあるので、writeText で試しなおす
                console.warn(error);
                return text.then(t => navigator.clipboard.writeText(t));
            });
    } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        done = text.then(t => navigator.clipboard.writeText(t));
    } else {
        toastDict['toast-clipboard-item'].show();
        return;
    }
    done.then(() => showCopied(message))
        .catch(error => {
            console.error(error);
            showFailed('文字列をコピーできませんでした（' + error.message + '）。');
        });
};

// 透過の設定に合わせて、画像を canvas に描く
const drawToCanvas = img => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');

    const tsCondition = document.getElementById('icon-copy-transparent-select').value;
    if (tsCondition == 'lightgray-to-transparent') {
        ctx.drawImage(img, 0, 0);
        const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imagedata.data;
        for (let i = 0; i < canvas.width * canvas.height * 4; i += 4) {
            if (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240 && data[i] === data[i + 1] && data[i + 1] === data[i + 2]) {
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
    } else {
        ctx.drawImage(img, 0, 0);
    }
    return canvas;
};

// canvas を使う操作: 'save-png'（PNG で保存）/ 'copy-png'（画像をコピー）/ 'copy-text'（PNG の Data URL をコピー）
const imgOnclick = (canvas, element, action) => {
    if (action === 'copy-png') {
        copyPng(canvas);
    } else if (action === 'copy-text') {
        // PNG形式のData URL
        copyText(canvas.toDataURL('image/png'), 'PNG形式のData URLをクリップボードにコピーしました。');
    } else {
        // PNGファイルダウンロード
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.setAttribute('download', basename(element.path) + '.png');
        a.dispatchEvent(new MouseEvent('click'));
    }
};

// 操作を行う。action: 'save-png' / 'save-svg' / 'copy-png' / 'copy-text'
const runAction = (img, element, action) => {
    if (action === 'save-svg') {
        saveSvg(element);
        return;
    }
    if (action === 'copy-text' && isSvg(img, element)) {
        // SVGのソース（元のファイル）
        copyText(fetch(element.path).then(response => {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.text();
        }), 'SVG文字列をクリップボードにコピーしました。');
        return;
    }

    const withCanvas = () => {
        try {
            imgOnclick(drawToCanvas(img), element, action);
        } catch (error) {
            console.error(error);
            showFailed('画像を扱えませんでした（' + error.message + '）。');
        }
    };

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        withCanvas();
        return;
    }
    // Firefoxで幅・高さが指定されていないSVGファイルが描画されないバグを回避
    fetch(img.src)
        .then(response => response.text())
        .then(svg => {
            const parser = new DOMParser();
            const result = parser.parseFromString(svg, 'text/xml');
            const svgElem = result.getElementsByTagName('svg')[0];
            svgElem.setAttribute('width', DEFAULT_SIZE + 'px');
            svgElem.setAttribute('height', DEFAULT_SIZE + 'px');
            const encoded = btoa(new XMLSerializer().serializeToString(svgElem));
            img.onload = withCanvas;
            img.src = 'data:image/svg+xml;base64,' + encoded;
        })
        .catch(error => {
            console.error(error);
            showFailed('画像を扱えませんでした（' + error.message + '）。');
        });
};

// 保存・コピーのメニュー（1 つを使い回す）。スマートフォンでは画像のタップで、PC では右上の ⋯ で開く
let menuTarget = null;
const menuActions = [
    ['save-png', 'PNG で保存'],
    ['save-svg', 'SVG で保存'],
    ['copy-png', '画像をコピー'],
    ['copy-text', '文字列をコピー'],
];
const closeMenu = restoreFocus => {
    const menu = document.getElementById('icon-menu');
    if (!menu || menu.classList.contains('d-none')) {
        return;
    }
    menu.classList.add('d-none');
    if (restoreFocus && menuTarget && menuTarget.opener) {
        menuTarget.opener.focus();
    }
    menuTarget = null;
};
const getMenu = () => {
    let menu = document.getElementById('icon-menu');
    if (menu) {
        return menu;
    }
    menu = document.createElement('div');
    menu.id = 'icon-menu';
    menu.className = 'icon-menu card shadow d-none';
    menu.setAttribute('role', 'menu');

    const title = document.createElement('div');
    title.id = 'icon-menu-title';
    title.className = 'icon-menu-title px-2 pt-1 text-secondary text-truncate';
    menu.appendChild(title);

    menuActions.forEach(([action, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-light btn-sm text-start rounded-0';
        button.dataset.action = action;
        button.setAttribute('role', 'menuitem');
        button.innerText = label;
        button.addEventListener('click', event => {
            event.stopPropagation();
            const target = menuTarget;
            closeMenu(false);
            if (target) {
                runAction(target.img, target.element, action);
            }
        });
        menu.appendChild(button);
    });

    menu.addEventListener('keydown', event => {
        const items = [...menu.querySelectorAll('button:not(.d-none)')];
        const index = items.indexOf(document.activeElement);
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu(true);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            items[(index + 1) % items.length].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            items[(index - 1 + items.length) % items.length].focus();
        } else if (event.key === 'Tab') {
            closeMenu(false);
        }
    });
    document.body.appendChild(menu);
    return menu;
};
const openMenu = (anchor, img, element) => {
    const menu = getMenu();
    menuTarget = { img: img, element: element, opener: anchor };
    document.getElementById('icon-menu-title').innerText = basename(element.path);
    // 「SVG で保存」は SVG のときだけ出す
    menu.querySelector('[data-action="save-svg"]').classList.toggle('d-none', !isSvg(img, element));
    menu.classList.remove('d-none');

    // 枠の下に出す。画面からはみ出すときは上に出す・左右に寄せる
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(8, Math.min(rect.left, document.documentElement.clientWidth - width - 8));
    let top = rect.bottom + 4;
    if (top + height > window.innerHeight - 8 && rect.top - height - 4 >= 8) {
        top = rect.top - height - 4;
    }
    menu.style.left = (left + window.scrollX) + 'px';
    menu.style.top = (top + window.scrollY) + 'px';
    menu.querySelector('button:not(.d-none)').focus({ preventScroll: true });
};
document.addEventListener('click', event => {
    if (!event.target.closest('#icon-menu')) {
        closeMenu(false);
    }
});
window.addEventListener('resize', () => closeMenu(false));

// マウスを載せられない端末（スマートフォンなど）か
const isTouchOnly = () => window.matchMedia('(hover: none)').matches;

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
    if (searchIndex == null) {
        showSpinner();
        ensureLoaded().then(() => parseJson(term, ignore_case)).catch(error => console.error(error));
    } else {
        showSpinner();
        const generation = ++searchGeneration;
        updateQueryString();

        let imageList = document.getElementById('image-list');
        imageList.innerHTML = '';
        updateMoreButton(0);

        // 語は空白で区切り、すべてを含むものに絞る（索引は並べ替え済みなので、結果も並び順どおり）
        const terms = (ignore_case ? term.toLowerCase() : term).split(/\s+/).filter(t => t !== '');
        const field = ignore_case ? 'lower' : 'text';
        let filtered = searchIndex.filter(entry => terms.every(t => entry[field].includes(t)));

        // Power Platform のコネクタは ?conn=t のときだけ出す
        if (retrieveQueryDict()['conn'] != 't') {
            filtered = filtered.filter(entry => !entry.connector);
        }

        // 出典ごとの件数（チップに出す）。キーワードで絞ったあと、出典で絞る前の数
        const counts = {};
        filtered.forEach(entry => {
            counts[entry.source] = (counts[entry.source] || 0) + 1;
        });
        // 今回の結果に無い出典の選択は外す（チップが消えて外せなくなるため）
        selectedSources.forEach(key => {
            if (!counts[key]) {
                selectedSources.delete(key);
            }
        });
        renderSourceFilter(counts, filtered.length, term, ignore_case);

        if (selectedSources.size > 0) {
            filtered = filtered.filter(entry => selectedSources.has(entry.source));
        }
        showResultCount(filtered.length);
        if (filtered.length == 0) {
            hideSpinner();
        } else {
            const sorted = filtered.map(entry => entry.element);

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
                    if (event.ctrlKey) {
                        runAction(img, element, 'copy-png');
                    } else if (event.shiftKey) {
                        runAction(img, element, 'copy-text');
                    } else if (isTouchOnly()) {
                        // スマートフォンでは修飾キーが使えないので、メニューを出す
                        event.stopPropagation();
                        openMenu(box, img, element);
                    } else {
                        runAction(img, element, 'save-png');
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

                    // 保存・コピーのメニューを開くボタン（PC ではマウスを載せたとき、タッチの端末では常に出す）
                    let more = document.createElement('button');
                    more.type = 'button';
                    more.classList.add('icon-more', 'btn', 'btn-light', 'p-0', 'position-absolute', 'top-0', 'end-0');
                    more.innerText = '⋯';
                    more.title = '保存・コピーのメニュー';
                    more.setAttribute('aria-label', '保存・コピーのメニュー（' + basename(element.path) + '）');
                    more.setAttribute('aria-haspopup', 'menu');
                    more.addEventListener('click', event => {
                        event.stopPropagation();
                        openMenu(more, img, element);
                    });

                    box.appendChild(img);
                    box.appendChild(more);
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
                img.title = element.path + "\n---\n" + element.description + "\n（クリック：PNGファイルをDL / Ctrl + クリック：画像をコピー / Shift + クリック：文字列をコピー / 右上の ⋯：保存・コピーのメニュー）";
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

const typingDelay = 200;
let typingTimer = null;
const scheduleSearch = () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        const term = document.getElementById('icon-search-term').value;
        if (term.trim() === '') {
            // 結果と件数を消す（空のまま全件を出さない。全件は Search ボタンで出せる）
            searchGeneration++;
            document.getElementById('image-list').innerHTML = '';
            updateMoreButton(0);
            renderSourceFilter({}, 0, '', false);
            showResultCount(null);
            hideSpinner();
            updateQueryString(); // 語を消したら URL の term も消す
            return;
        }
        parseJson(term, document.getElementById('icon-search-ignorecase').checked);
    }, typingDelay);
};

window.addEventListener('DOMContentLoaded', _ => {
    loadDataSource();
    loadJson();

    document.getElementById('icon-search-ignorecase').addEventListener('change', _ => {
        updateIgnoreCaseLabel();
        updateQueryString();
    });
    // コピーの設定（透明の扱い）も URL に残す
    document.getElementById('icon-copy-transparent-select').addEventListener('change', updateQueryString);

    document.querySelectorAll('.alert').forEach((alert) => new bootstrap.Alert(alert));
    toastDict = {
        'toast-copied': new bootstrap.Toast(document.getElementById('toast-copied'), {
            delay: 2000,
        }),
        'toast-failed': new bootstrap.Toast(document.getElementById('toast-failed'), {
            delay: 5000,
        }),
        'toast-clipboard-item': new bootstrap.Toast(document.getElementById('toast-clipboard-item'), {
            delay: 5000,
        }),
        'toast-input-keyword': new bootstrap.Toast(document.getElementById('toast-input-keyword'), {
            delay: 10000,
        })
    };

    // クエリパラメーターをもとに設定: icon-search-ignorecase
    let ic = retrieveQueryDict()['ic'];
    if (ic == 't') {
        document.getElementById('icon-search-ignorecase').checked = true;
    }
    // ブラウザーが前の状態のスイッチを戻したときも、文言を合わせる
    updateIgnoreCaseLabel();

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

    // 打つたびに絞り込む（入力が止まって typingDelay ms 後）。空にしたら結果を消す
    document.getElementById('icon-search-term').addEventListener('input', e => {
        updateSuggestions(e.target.value);
        scheduleSearch();
    });
    // 大文字・小文字の切り替えも、入力があれば検索しなおす
    document.getElementById('icon-search-ignorecase').addEventListener('change', _ => {
        if (document.getElementById('icon-search-term').value.trim() !== '') {
            scheduleSearch();
        }
    });
});
