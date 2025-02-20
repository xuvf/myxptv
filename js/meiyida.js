
const cheerio = createCheerio()
// 设置User Agent，模拟iPhone浏览器
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
const mainUrl = 'https://www.mydys3.com/'

// 应用配置对象，包含版本、标题、网站和导航标签
let appConfig = {
    ver: 1,
    title: '美益达',
    site: mainUrl,
    tabs: [{
        name: '电影',  // 首页标签
        ext: {
            id: 0,
            url: mainUrl + 'vodshow/1-----------.html',
        },
    }, {
        name: '电视剧',  // 首页标签
        ext: {
            id: 1,
            url: mainUrl + 'vodshow/2-----------.html',
        },
    }, {
        name: '综艺',  // 电影标签
        ext: {
            id: 2,
            url: mainUrl + 'vodshow/3-----------.html',
        },
    }, {
        name: '动漫',  // 电视剧标签
        ext: {
            id: 3,
            url: mainUrl + 'vodshow/4-----------.html',
        },
    }, {
        name: '短剧',  // 电视剧标签
        ext: {
            id: 4,
            url: mainUrl + 'vodshow/5-----------.html',
        },
    }, {
        name: '今日更新',  // 电视剧标签
        ext: {
            id: 5,
            url: mainUrl + 'label/new.html',
        },
    },],
}

// 创建缓存Map用于存储页面信息
const $cache = new Map();

// 获取配置信息的函数
async function getConfig() {
    return jsonify(appConfig)
}

// 获取视频卡片列表的函数
async function getCards(ext) {
    ext = argsify(ext)
    // 初始化页码缓存
    var lastPage = {
        0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1,
    }
    // 从缓存中获取页码信息
    let val = $cache.get('av')
    if (val) {
        lastPage = argsify(val)
    }

    let cards = []
    let { id, page = 1, url } = ext

    // 构建分页URL
    if (page > 1) {
        url += `/page-${lastPage[id] - page + 1}.html`
    }

    console.log(`url: ${url}`)

    // 发送HTTP请求获取页面内容
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    // 使用cheerio加载HTML
    const $ = cheerio.load(data)

    // 解析视频列表
    $('.main .content .module-poster-item').each((_, element) => {
        const href = $(element).attr('href')
        const title = $(element).attr('title')
        const cover = $(element).find('.lazy').attr('data-original')

        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    // 获取最后一页的页码并缓存
    if (page === 1) {
        const pageNumber = $('#MainContent_header_nav .page-number').text()
        lastPage[id] = pageNumber.split('/')[1]
        const jsonData = jsonify(lastPage, null, 2)
        $cache.set('av', jsonData)
    }

    return jsonify({
        list: cards,
    })
}

// 获取视频播放列表的函数
async function getTracks(ext) {
    ext = argsify(ext)
    let groups = []
    let url = ext.url

    // 获取页面内容
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    // 检查多组
    $('.tab-item').each(i => {
        let title = $('.tab-item')[i]['attribs']['data-dropdown-value']

        let group = {
            title: title,
            tracks: []
        }

        $($('.module-play-list-content')[i]).find('a').each((_, item) => {
            group.tracks.push({
                name: $(item).text(),
                pan: '',
                ext: {
                    url: appConfig.site + $(item).attr('href')
                }
            })
        })

        groups.push(group)
    })

    return jsonify({ list: groups })
}

// 获取播放信息的函数
async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    // let url = ext.url.replace('www.', '')

    // 获取视频页面内容
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    // 获取视频源URL
    const obj = argsify(data.match(/player_aaaa=(.+?)<\/script>/)[1])
    let playUrl = obj.url

    return jsonify({ urls: [playUrl] })
}

// 搜索功能实现
async function search(ext) {
    ext = JSON.parse(ext)
    let cards = []

    // URL编码搜索文本
    text = encodeURIComponent(ext.text)
    let url = appConfig.site + `vodsearch/-------------.html?wd=${text}`

    // 获取搜索结果页面
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 解析搜索结果列表
    $('.module-card-item').each((_, element) => {
        const title = $(element).find('.lazyload').attr('alt')
        const cover = $(element).find('img').attr('data-original')
        const href = $(element).find('.module-card-item-poster').attr('href')
        // const subTitle = $(element).find('label[title=分辨率]').text().split('/')[0]
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}
