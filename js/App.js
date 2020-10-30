const log = console.log;


window.addEventListener("load", () => {
    let app = new App();
});

class App {
    constructor() {
        log(localStorage);
        this.json;
        this.datas = JSON.parse(localStorage.datas) == undefined || JSON.parse(localStorage.datas).length == 0 || !JSON.parse(localStorage.datas) ? [] : JSON.parse(localStorage.datas);
        this.investor_list = JSON.parse(localStorage.investor_list) == undefined || JSON.parse(localStorage.investor_list).length == 0 || !JSON.parse(localStorage.investor_list) ? [] : JSON.parse(localStorage.investor_list);;

        this.$now_page = $('.main_container .main');
        // this.$now_page = $('.main_container .fund_register');
        // this.$now_page = $('.main_container .fund_view');
        // this.$now_page = $('.main_container .investor_list');
        this.$now_page.data("idx", 0);
        this.$now_page.show();
        this.is_show = true;
        this.is_moveing = false;

        this.$list_box = $('.fund_view .list_box');
        this.$list_box.data("page", 1);

        this.$popup = $('.popup');
        this.$popup.hide();
        this.canvas = this.$popup.find('canvas')[0];
        this.canvas.width = 610;
        this.canvas.height = 200;

        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = 3;

        this.is_drawing = false;
        this.preX = -1;
        this.preY = -1;
        this.drawing_ok = false;

        this.$tbody = $('.investor_list table tbody');
        this.$tbody.data("page", 1);


        this.sort_idx = 0;

        this.init();
    }

    async init() {
        this.json = await this.getJSON();
        if (this.datas.length == 0) {
            this.datas = this.getDatas();
        }
        this.sort();
        log(this.datas);

        this.setEvent();
        this.loadMain();
        this.visualAnimation();
    }

    movePage(next_idx) {
        let next_page = $('.main_container .section').eq(next_idx);
        let now_idx = this.$now_page.data('idx');
        log(next_idx, now_idx);
        if (next_idx != now_idx) {
            let top = this.$now_page.height();
            next_page.show().css("top", top + "px").animate({ "top": 0 }, 800);
            this.$now_page.animate({ "top": -top + "px" }, 800).fadeOut(1);
            setTimeout(() => {
                this.is_moveing = false;
                this.$now_page = next_page;
                this.$now_page.data("idx", next_idx);
            }, 1000);
            if (next_idx == 0) this.loadMain();
            else if (next_idx == 1) this.loadFundRegister();
            else if (next_idx == 2) this.loadFundView();
            else if (next_idx == 3) this.loadInvestor();
        } else {
            this.is_moveing = false;
        }
    }

    setEvent() {
        //헤더이벤트 시작 --------------
        $(document).on("click", "header .nav > div", (e) => {
            let idx = e.currentTarget.dataset.idx;
            if (this.is_moveing) return;
            this.is_moveing = true;
            $('header .nav div').removeClass("on");
            $('header .nav div').eq(idx).addClass("on");

            this.movePage(idx);
        });
        //헤더이벤트 끝 --------------

        //등록이벤트 시작 -------------------

        $(document).on("click", ".reg_btn", () => {
            let num = $('.reg_num').html().trim();
            let name = $('.reg_name').val().trim();
            let end = $('.reg_end').val().trim();
            let money = $('.reg_money').val().trim();

            if (num == "" || name == "" || end == "" || money == "" || money <= 0) {
                alert("값이 잘못되었거나 비어있습니다");
                return;
            }
            money = this.removeComma(money) * 1;
            name = name.replaceAll(" ", "||SPACE++");
            end = end.replaceAll("T", " ");
            let obj = {
                number: num,
                name: name,
                endDate: end,
                total: money,
                current: 0,
                xss_name: this.xss(name),
                str_total: money.toLocaleString(),
                str_current: 0,
                percent: this.getPercent(money, 0)
            }
            this.datas.push(obj);
            this.loadFundRegister();
            this.saveLocalData();
            log(this.datas);
        });

        $(document).on("input", ".reg_money", (e) => {
            let value = this.removeComma(e.currentTarget.value);
            value = (value.replaceAll(/[^0-9]/g, "") * 1).toLocaleString();
            e.currentTarget.value = value;
        });


        //등록이벤트 끝 -------------------


        //보기이벤트 시작 -------------------

        $(document).on("click", ".view_pagination_group .num", (e) => {
            let page = e.currentTarget.dataset.page;
            if (page == 'no') return;
            this.$list_box.data("page", page);
            this.loadFundView();
        });

        $(document).on("click", ".fund_view .view_btn.on", (e) => {
            let num = e.currentTarget.dataset.num;
            let fund = this.datas.find(x => x.number == num);
            this.$popup.find("input").val('');
            this.drawing_ok = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.$popup.find('.popup_num').html(fund.number);
            this.$popup.find(".popup_name").val(fund.name);
            this.$popup.find(".popup_money").data("max", fund.total);
            this.$popup.fadeIn();
        });

        $(document).on("input", ".popup_money", (e) => {
            let max = $(e.currentTarget).data("max") * 1;
            let value = this.removeComma(e.currentTarget.value);
            value = (value.replaceAll(/[^0-9]/g, "") * 1).toLocaleString();
            if (this.removeComma(value) * 1 > max) {
                value = max.toString();
                value = (value.replaceAll(/[^0-9]/g, "") * 1).toLocaleString();
            }
            log(value);
            e.currentTarget.value = value;
        });

        $(document).on("click", ".popup_btn", (e) => {
            let num = $('.popup_num').html().trim();
            let name = $('.popup_name').val().trim();
            let user = $('.popup_user').val().trim();
            let money = $('.popup_money').val().trim();
            let url = this.canvas.toDataURL();
            if (num == "" || name == "" || user == "" || money == "" || !this.drawing_ok || money <= 0) {
                alert("값이 잘못되거나 비어있습니다.");
                return;
            }
            money = this.removeComma(money) * 1;
            let normal_name = name;
            let normal_user = user;
            name = name.replaceAll(" ", "||SPACE++");
            user = user.replaceAll(" ", "||SPACE++");



            let fund = this.datas.find(x => x.number == num);
            fund.current = (fund.current * 1) + money;
            fund.str_current = fund.current.toLocaleString();
            fund.percent = this.getPercent(fund.total, fund.current);

            let find_user = this.investor_list.find(x => x.number == num && x.user == user);
            if (find_user == undefined) {
                let obj = {
                    number: num,
                    name: name,
                    user: user,
                    money: money,
                    xss_name: this.xss(name),
                    xss_user: this.xss(user),
                    normal_user: normal_user,
                    normal_name: normal_name,
                    str_money: money.toLocaleString(),
                    percent: this.getPercent(fund.total, money),
                    url: url
                }
                this.investor_list.unshift(obj);
            } else {
                find_user.money = find_user.money + money;
                find_user.str_money = find_user.money.toLocaleString();
                find_user.percent = this.getPercent(fund.total, find_user.money);
                find_user.url = url;
            }
            log(this.investor_list);
            this.$popup.find("input").val('');
            this.drawing_ok = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.$popup.fadeOut();
            this.saveLocalData();
            this.loadFundView();
        });

        this.$popup.on("click", ".close", () => {
            this.$popup.fadeOut();
        });

        $(this.canvas).on("mousedown", (e) => {
            this.preX = e.offsetX;
            this.preY = e.offsetY;
            this.is_drawing = true;
        });

        $(this.canvas).on("mousemove", (e) => {
            if (!this.is_drawing) return;
            this.drawing_ok = true;
            let x = e.offsetX;
            let y = e.offsetY;
            this.ctx.beginPath();
            this.ctx.moveTo(this.preX, this.preY);
            this.ctx.lineTo(x, y);
            this.ctx.closePath()
            this.ctx.stroke();
            this.preX = x;
            this.preY = y;
        });

        $(this.canvas).on("mouseover", (e) => {
            this.preX = e.offsetX;
            this.preY = e.offsetY;

            this.is_drawing = false;
        });

        $(this.canvas).on("mouseup", () => { this.is_drawing = false });


        $(document).on("change", ".view_select", (e) => {
            let value = e.currentTarget.value;
            this.sort_idx = value;
            this.$list_box.data("page", 1);
            this.loadFundView();
        });


        //보기이벤트 끝 -------------------

        //투자자이벤트 시작 ----------------

        $(document).on("click", ".in_pagination_group .num", (e) => {
            let page = e.currentTarget.dataset.page;
            if (page == 'no') return;
            log(page);
            this.$tbody.data("page", page);
            this.loadInvestor();
        });

        $(document).on("click", ".in_btn", (e) => {
            let num = e.currentTarget.dataset.num;
            let user = e.currentTarget.dataset.user;
            let data = this.investor_list.find(x => x.number == num && x.user == user);
            log(data);
            let sign = new Image();
            sign.src = data.url;
            sign.addEventListener('load', () => {
                let funding_img = new Image();
                funding_img.src = '/images/funding.png';
                funding_img.addEventListener("load", () => {
                    let ca = document.createElement("canvas");
                    ca.width = 793;
                    ca.height = 495;
                    let ctx = ca.getContext('2d');
                    ctx.drawImage(funding_img, 0, 0);
                    ctx.drawImage(sign, 460, 350, 200, 120);
                    ctx.fillStyle = "15px noto";
                    ctx.fillText(data.number, 350, 170);
                    ctx.fillText(data.normal_name, 350, 220);
                    ctx.fillText(data.normal_user, 350, 270);
                    ctx.fillText(data.str_money + "원", 350, 320);
                    let a = document.createElement('a');
                    a.href = ca.toDataURL();
                    a.download = "";
                    a.click();
                });
            });
        });




        //투자자이벤트 끝 ----------------
    }

    loadFundRegister() {
        //로드등록
        let text = this.getRandomText();
        $('.reg_num').html(text);
        $('.fund_register input').val('');
    }

    loadFundView() {
        //로드보기
        log(this.sort_idx);
        this.sort(this.sort_idx);
        let page = this.$list_box.data("page");
        this.$list_box.fadeOut(800);
        setTimeout(() => {
            const ITEM_COUNT = 6;
            const BTN_COUNT = 5;

            let total_page = Math.ceil(this.datas.length / ITEM_COUNT);
            total_page = total_page <= 0 ? 1 : total_page;
            let current_block = Math.ceil(page / BTN_COUNT);

            let start = current_block * BTN_COUNT - BTN_COUNT + 1;
            let end = start + BTN_COUNT - 1;
            end = end >= total_page ? total_page : end;

            let prev = start > 1;
            let next = end < total_page;

            let start_idx = (page - 1) * ITEM_COUNT;
            let end_idx = start_idx + ITEM_COUNT;
            let view_lsit = this.datas.slice(start_idx, end_idx);

            let htmlBtns = `<div class="num ${prev ? '' : 'disable'}" data-page="${prev ? start - 1 : 'no'}"><i class="fas fa-chevron-left"></i></div>`;
            for (let i = start; i <= end; i++) {
                htmlBtns += `<div class="num ${page == i ? 'on' : ''}" data-page="${i}">${i}</div>`;
            }
            htmlBtns += `<div class="num ${next ? '' : 'disable'}" data-page="${next ? end + 1 : 'no'}"><i class="fas fa-chevron-right"></i></div>`;
            $('.fund_view .view_pagination_group').html(htmlBtns);

            this.$list_box.empty();
            view_lsit.forEach(x => {
                this.$list_box.append(this.makeFundDom(x));
            });
            view_lsit.forEach((item, idx) => {
                setTimeout(() => {
                    this.$list_box.find('.bar').eq(idx).animate({ 'width': item.percent >= 100 ? 100 + "%" : item.percent + '%' }, 2000);
                }, 500);

            });
            this.$list_box.fadeIn(300);
        }, 800);
    }

    loadInvestor() {
        //로드투자자
        let page = this.$tbody.data("page");
        this.$tbody.fadeOut(800);
        setTimeout(() => {
            const ITEM_COUNT = 5;
            const BTN_COUNT = 5;

            let total_page = Math.ceil(this.investor_list.length / ITEM_COUNT);
            total_page = total_page <= 0 ? 1 : total_page;
            let current_block = Math.ceil(page / BTN_COUNT);

            let start = current_block * BTN_COUNT - BTN_COUNT + 1;
            let end = start + BTN_COUNT - 1;
            end = end >= total_page ? total_page : end;

            let prev = start > 1;
            let next = end < total_page;

            let start_idx = (page - 1) * ITEM_COUNT;
            let end_idx = start_idx + ITEM_COUNT;
            let view_lsit = this.investor_list.slice(start_idx, end_idx);

            let htmlBtns = `<div class="num ${prev ? '' : 'disable'}" data-page="${prev ? start - 1 : 'no'}"><i class="fas fa-chevron-left"></i></div>`;
            for (let i = start; i <= end; i++) {
                htmlBtns += `<div class="num ${page == i ? 'on' : ''}" data-page="${i}">${i}</div>`;
            }
            htmlBtns += `<div class="num ${next ? '' : 'disable'}" data-page="${next ? end + 1 : 'no'}"><i class="fas fa-chevron-right"></i></div>`;
            $('.investor_list .in_pagination_group').html(htmlBtns);

            this.$tbody.empty();
            view_lsit.forEach(x => {
                this.$tbody.append(this.makeInvestorDom(x));
            });
            view_lsit.forEach((item, idx) => {
                setTimeout(() => {
                    this.$tbody.find('.bar').eq(idx).animate({ 'width': item.percent >= 100 ? 100 + "%" : item.percent + '%' }, 2000);
                }, 500);

            });
            this.$tbody.fadeIn(300);
        }, 800);
    }

    loadMain() {
        //로드메인
        this.sort();
        let view_list = this.datas.filter(x => new Date() < new Date(x.endDate));
        view_list = view_list.slice(0, 4);
        view_list.forEach((item, idx) => {
            $('.main_fund_list .item').eq(idx).find('.main_percent').html(item.percent + "%");
            $('.main_fund_list .item').eq(idx).find('.main_name').html(item.xss_name);
            $('.main_fund_list .item').eq(idx).find('.main_name').attr("title", item.name);
            $('.main_fund_list .item').eq(idx).find('.main_end').html("마감일 - " + item.endDate);
            $('.main_fund_list .item').eq(idx).find('.main_current').html(item.str_current + "원 펀딩");
            $('.main_fund_list .item').eq(idx).find('.main_current').attr("title", item.str_current + "원 펀딩");
        });
        $('.main .text').hide();
        $('.main .item0').css("margin-left", "-300px");
        $('.main .item1').css("margin-left", "-600px");
        $('.main .item3').css("margin-top", "-300px");
        $('.main .item4').css("margin-left", "-600px");
        setTimeout(() => {
            log("dsas");
            $('.main .text').fadeIn(1000);
            $('.main .item0').animate({ "margin-left": "0" }, 900);
            $('.main .item1').animate({ "margin-left": "0" }, 1800);
            $('.main .item3').animate({ "margin-top": "0" }, 900);
            $('.main .item4').animate({ "margin-left": "0" }, 900);
        }, 400);
    }

    makeInvestorDom(x) {
        return `
                        <tr>
                            <td class="text_over color_000 fw_500" title="${x.number}">${x.number}</td>
                            <td class="text_over color_000 fw_500" title="${x.xss_name}">${x.xss_name}</td>
                            <td class="text_over color_000 fw_500" title="${x.xss_user}">${x.xss_user}</td>
                            <td class="text_over color_000 fw_500" title="${x.str_money}원">${x.str_money}원</td>
                            <td class="text_over color_000 fw_500" title="${x.percent}%">
                               ${x.percent}%
                                <div class="bar"></div>
                            </td>
                            <td class="text_over color_000 fw_500">
                                <div class="in_btn" data-num="${x.number}" data-user="${x.user}">투자펀드계약서</div>
                            </td>
                        </tr>
        `
    }

    makeFundDom(x) {
        return `
                    <div class="item">
                        <img src="images/optimize.jpg" alt="">
                        <span class="view_num">${x.number}</span>
                        <div class="color_000 fw_500 font_18 text_over view_name m_t_10" title="${x.xss_name}">${x.xss_name}
                        </div>
                        <div class="view_percent color_blue font_22 fw_600 text_over   flex flex_a_c" title="${x.percent}%">
                            ${x.percent}%
                            <div class="color_999 font_13 m_l_10 fw_500 text_over" title="${x.str_current}원 / ${x.str_total}원">${x.str_current}원 / ${x.str_total}원</div>
                        </div>
                        <div class="color_999 font_13 fw_500 text_over">
                            <span class="fw_600 color_777">마감일 - </span> ${x.endDate}
                        </div>
                        <div class="flex flex_e">
                            <div class="view_btn ${new Date() < new Date(x.endDate) ? 'on' : ''}" data-num="${x.number}">${new Date() < new Date(x.endDate) ? '투자하기' : '모집완료'}</div>
                        </div>
                        <div class="bar m_t_10"></div>
                    </div>
        `
    }

    saveLocalData() {
        localStorage.datas = JSON.stringify(this.datas, null, 0);
        localStorage.investor_list = JSON.stringify(this.investor_list, null, 0);
    }

    removeComma(str) {
        return str.split(',').join('');
    }

    getRandomText() {
        let r = String.fromCharCode(Math.floor(Math.random() * 26) + 65);
        let n = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        return r + n;
    }


    sort(type = 0) {
        if (type == 0) {
            log("dsasd");
            this.datas.sort((a, b) => {
                return a.percent < b.percent ? 1 : a.percent > b.percent ? -1 : 0;
            });
        } else if (type == 1) {
            this.datas.sort((a, b) => {
                return new Date(a.endDate) < new Date(b.endDate) ? 1 : new Date(a.endDate) > new Date(b.endDate) ? -1 : 0;
            });
        }
    }

    getDatas() {
        return this.json.map(x => {
            return {
                number: x.number,
                name: x.name,
                endDate: x.endDate,
                total: x.total,
                current: x.current,
                xss_name: this.JSONxss(x.name),
                str_total: x.total.toLocaleString(),
                str_current: x.current.toLocaleString(),
                percent: this.getPercent(x.total, x.current)
            }
        });
    }

    getPercent(total, current) {
        return Math.ceil((current / total * 100) * 100) / 100;
    }

    JSONxss(str) {
        let arr = [
            ["&", "&amp;"],
            ["<", "&lt;"],
            [">", "&gt;"],
            ["'", "&#39;"],
            ['"', "&quot;"],
            ["\n", "<br>"],
            ["||SPACE++", "&nbsp;"]
        ]

        arr.forEach(x => {
            str = str.replaceAll(x[0], x[1]);
        });

        return str;
    }

    xss(str) {
        let arr = [
            ["&", "&amp;"],
            ["<", "&lt;"],
            [">", "&gt;"],
            ["'", "&#39;"],
            ['"', "&quot;"],
            ["\n", "\\n"],
            ["||SPACE++", "&nbsp;"]
        ]

        arr.forEach(x => {
            str = str.replaceAll(x[0], x[1]);
        });

        return str;
    }

    visualAnimation() {
        setInterval(() => {
            if (this.is_show) {
                $(".main .visual img").eq(1).fadeOut(1000);
            } else {
                $(".main .visual img").eq(1).fadeIn(1000);
            }
            this.is_show = !this.is_show
        }, 5000);
    }


    getJSON() {
        return $.ajax('/js/fund.json');
    }
}