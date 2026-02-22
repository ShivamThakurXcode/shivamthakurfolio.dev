gsap.registerPlugin(ScrollTrigger);

(function ($) {
    "use strict";
    // DOM Ready

    /*========== Start - Scroll Text Animation ==========*/
    /* Animation Text
    ---------------------------------------------------------- */
    var animation_text = function () {
        if ($(".split-text").length > 0) {
            var st = $(".split-text");
            if (st.length === 0) return;
            gsap.registerPlugin(SplitText, ScrollTrigger);
            st.each(function (index, el) {
                const $el = $(el);
                const $target = $el.find("p, a").length > 0 ? $el.find("p, a")[0] : el;
                const hasClass = $el.hasClass.bind($el);
                const pxl_split = new SplitText($target, {
                    type: "words, chars",
                    lineThreshold: 0.5,
                    linesClass: "split-line",
                });
                let split_type_set = pxl_split.chars;
                gsap.set($target, { opacity: 1, perspective: 400 });

                const settings = {
                    scrollTrigger: {
                        trigger: $target,
                        start: "top 86%",
                        toggleActions: "play none none none",
                    },
                    // opacity: 0,
                    duration: 0.9,
                    stagger: 0.02,
                    ease: "power3.out",
                };

                if (hasClass("effect-fade")) settings.opacity = 0;

                if (hasClass("split-lines-transform") || hasClass("split-lines-rotation-x")) {
                    pxl_split.split({
                        type: "lines",
                        lineThreshold: 0.5,
                        linesClass: "split-line",
                    });
                    split_type_set = pxl_split.lines;
                    settings.opacity = 0;
                    settings.stagger = 0.5;
                    if (hasClass("split-lines-rotation-x")) {
                        settings.rotationX = -120;
                        settings.transformOrigin = "top center -50";
                    } else {
                        settings.yPercent = 100;
                        settings.autoAlpha = 0;
                    }
                }

                if (hasClass("split-words-scale")) {
                    pxl_split.split({ type: "words" });
                    split_type_set = pxl_split.words;
                    split_type_set.forEach((elw, index) => {
                        gsap.set(
                            elw,
                            {
                                opacity: 0,
                                scale: index % 2 === 0 ? 0 : 2,
                                force3D: true,
                                duration: 0.1,
                                ease: "power3.out",
                                stagger: 0.02,
                            },
                            index * 0.01
                        );
                    });
                    gsap.to(split_type_set, {
                        scrollTrigger: {
                            trigger: el,
                            start: "top 86%",
                        },
                        rotateX: "0",
                        scale: 1,
                        opacity: 1,
                    });
                } else if (hasClass("effect-blur-fade")) {
                    pxl_split.split({ type: "lines" });
                    split_type_set = pxl_split.lines;
                    gsap.fromTo(
                        split_type_set,
                        { opacity: 0, filter: "blur(10px)", y: 20 },
                        {
                            opacity: 1,
                            filter: "blur(0px)",
                            y: 0,
                            duration: 1,
                            stagger: 0.1,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: $target,
                                start: "top 86%",
                                toggleActions: "play none none none",
                            },
                        }
                    );
                } else {
                    gsap.from(split_type_set, settings);
                }
            });
        }
    };

    /* Scroll Effect
    ---------------------------------------------------------- */
    var scrolling_effect = function () {
        if ($(".scrolling-effect").length > 0) {
            var st = $(".scrolling-effect");
            st.each(function (index, el) {
                var $el = $(el);
                var delay = parseFloat($el.data("delay")) || 0;
                var settings = {
                    scrollTrigger: {
                        trigger: el,
                        scrub: 3,
                        once: true,
                        toggleActions: "play none none none",
                        start: "30px bottom",
                        end: "bottom bottom",
                        delay: delay,
                    },
                    duration: 0.8,
                    ease: "power3.out",
                };

                if ($el.hasClass("effectRight")) {
                    settings.opacity = 0;
                    settings.x = "80";
                }
                if ($el.hasClass("effectLeft")) {
                    settings.opacity = 0;
                    settings.x = "-80";
                }
                if ($el.hasClass("effectBottom")) {
                    settings.opacity = 0;
                    settings.y = "100";
                }
                if ($el.hasClass("effectTop")) {
                    settings.opacity = 0;
                    settings.y = "-80";
                }
                if ($el.hasClass("effectZoomIn")) {
                    settings.opacity = 0;
                    settings.scale = 0.4;
                }

                gsap.from(el, settings);
            });
        }
    };
    /*========== End - Scroll Text Animation ==========*/

    /*========== Start - Scroll Orther Animation ==========*/
    /* Flip Animation
    ---------------------------------------------------------- */
    var gsapA2 = () => {
        if ($(".gsap-anime-2").length) {
            const cards = document.querySelectorAll(".flip-image");

            function animate() {
                // const isMobile = window.innerWidth < 767;
                // const cardW = isMobile ? 150 : 325;
                // const cardH = isMobile ? 150 : 325;

                const isMobile = window.innerWidth < 575;
                const cardW = 150;
                const cardH = 150;

                const parent = cards[0].parentElement;
                // parent.style.position = "relative";
                const centerX = parent.clientWidth / 2 - cardW / 2;
                const centerY = parent.clientHeight / 2 - cardH / 2;

                cards.forEach((card, i) => {
                    card.style.position = "absolute";
                    card.style.zIndex = i + 1;
                });

                const tl = gsap.timeline({
                    defaults: { ease: "power3.out" },
                    scrollTrigger: {
                        trigger: ".gsap-anime-2",
                        start: "top 80%",
                        toggleActions: "play none none reverse",
                        // markers: true,
                    },
                });

                tl.to(cards, {
                    x: centerX,
                    y: centerY,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.1,
                }).to(cards, {
                    x: (i) => {
                        if (i === 0) return centerX - (isMobile ? 150 : 225);
                        if (i === 1) return centerX - (isMobile ? 90 : 135);
                        if (i === 2) return centerX - (isMobile ? 30 : 45);
                        if (i === 3) return centerX + (isMobile ? 30 : 45);
                        if (i === 4) return centerX + (isMobile ? 90 : 135);
                        if (i === 5) return centerX + (isMobile ? 150 : 225);
                        return centerX;
                    },
                    y: (i) => {
                        if (i === 0) return centerY - (isMobile ? 150 : 150);
                        if (i === 1) return centerY - (isMobile ? 90 : 90);
                        if (i === 2) return centerY - (isMobile ? 30 : 30);
                        if (i === 3) return centerY + (isMobile ? 30 : 30);
                        if (i === 4) return centerY + (isMobile ? 90 : 90);
                        if (i === 5) return centerY + (isMobile ? 150 : 150);
                        return centerY;
                    },
                    rotation: -10,
                    rotateX: 4,
                    rotateY: 10,
                    duration: 1,
                    ease: "power2.out",
                    delay: 0.3,
                });
            }

            animate();

            window.addEventListener("resize", () => {
                gsap.killTweensOf(".flip-image");
                animate();
            });
        }
    };
    /* Scroll Effect Fade
    ---------------------------------------------------------- */
    var scrollEffectFade = () => {
        if ($(".effectFade").length) {
            document.querySelectorAll(".effectFade").forEach((el) => {
                let fromVars = { autoAlpha: 0 };
                let toVars = { autoAlpha: 1, duration: 1, ease: "power3.out" };
                let wrapper = null;
                let startPush = "top 96%";
                let delay = el.dataset.delay ? parseFloat(el.dataset.delay) : 0;
                toVars.delay = delay;

                if (el.classList.contains("fadeUp") && !el.classList.contains("no-div")) {
                    wrapper = document.createElement("div");
                    wrapper.classList.add("overflow-hidden");
                    el.parentNode.insertBefore(wrapper, el);
                    wrapper.appendChild(el);
                }

                if (el.classList.contains("no-div")) {
                    wrapper = null;
                }
                if (el.classList.contains("fadeUp")) {
                    fromVars.y = 50;
                    toVars.y = 0;
                } else if (el.classList.contains("fadeDown")) {
                    fromVars.y = -50;
                    toVars.y = 0;
                } else if (el.classList.contains("fadeLeft")) {
                    fromVars.x = -50;
                    toVars.x = 0;
                } else if (el.classList.contains("fadeRight")) {
                    fromVars.x = 50;
                    toVars.x = 0;
                } else if (el.classList.contains("fadeRotateX")) {
                    fromVars.rotationX = 45;
                    fromVars.yPercent = 100;
                    fromVars.transformOrigin = "top center -50";
                    toVars.rotationX = 0;
                    toVars.yPercent = 0;
                    toVars.transformOrigin = "top center -50";
                    toVars.duration = 1;
                    toVars.ease = "power3.out";
                    if (wrapper) {
                        wrapper.style.perspective = "400px";
                    }
                } else if (el.classList.contains("fadeZoom")) {
                    fromVars.scale = 0.8;
                    toVars.scale = 1;
                }

                if (el.classList.contains("view-visible")) {
                    startPush = "top 101%";
                }

                gsap.set(el, fromVars);

                gsap.to(el, {
                    ...toVars,
                    scrollTrigger: {
                        trigger: el,
                        start: startPush,
                        toggleActions: "play none none none",
                        // onEnter: () => el.classList.add("animated"),
                        // markers: el.classList.contains("fadeUp"),
                    },
                });
            });
        }
    };
    /* Scroll Line
    ---------------------------------------------------------- */
    var scrollLine = () => {
        if ($(".scroll-down").length) {
            // setup progress line
            gsap.set(".prg-line", { height: "0%" });
            gsap.to(".prg-line", {
                height: "100%",
                duration: 2,
                ease: "none",
                scrollTrigger: {
                    trigger: ".scroll-down",
                    start: "top 40%",
                    end: "bottom 30%",
                    scrub: true,
                    // markers: true,
                },
            });

            // activate timeline items
            const items = document.querySelectorAll(".timeline-item");
            items.forEach((item) => {
                ScrollTrigger.create({
                    trigger: item,
                    start: "top 30%",
                    // end: "bottom 30%",
                    onEnter: () => item.classList.add("active"),
                    onLeaveBack: () => item.classList.remove("active"),
                    // markers: true,
                });
            });
        }
    };
    /* Tech Progress
    ---------------------------------------------------------- */
    var techProgress = () => {
        gsap.utils.toArray(".progress-line").forEach((el) => {
            const progress = el.dataset.progress;

            gsap.fromTo(
                el,
                { width: "15%" },
                {
                    width: progress + "%",
                    duration: 1.5,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: el,
                        start: "top 80%",
                        toggleActions: "play none none none",
                    },
                }
            );
        });
    };
    /* Service
    ---------------------------------------------------------- */
    var service = () => {
        gsap.registerPlugin(ScrollTrigger);

        let triggers = [];
        let isClickScrolling = false;

        function scrollActive() {
            const sidebar = document.querySelector(".sidebar-user");
            const works = document.querySelectorAll(".sticky-item");

            if (!sidebar || !works.length) return;

            triggers.forEach((t) => t.kill());
            triggers = [];

            const firstWork = works[0];
            const lastWork = works[works.length - 1];

            const sidebarTrigger = ScrollTrigger.create({
                trigger: firstWork,
                start: "top 132px",
                endTrigger: lastWork,
                end: "bottom 68px",
                onEnter: () => !isClickScrolling && sidebar.classList.add("active"),
                onLeave: () => !isClickScrolling && sidebar.classList.remove("active"),
                onEnterBack: () => !isClickScrolling && sidebar.classList.add("active"),
                onLeaveBack: () => !isClickScrolling && sidebar.classList.remove("active"),
                invalidateOnRefresh: true,
                // markers: true, //Debug
            });
            triggers.push(sidebarTrigger);

            works.forEach((work) => {
                const wrap = work.querySelector(".wrap");
                if (!wrap) return;

                const workTrigger = ScrollTrigger.create({
                    trigger: work,
                    start: "top 132px",
                    end: "bottom 68px",
                    onEnter: () => {
                        if (isClickScrolling) return;
                        gsap.utils.toArray(".wrap").forEach((el) => el.classList.remove("active"));
                        wrap.classList.add("active");
                    },
                    onEnterBack: () => {
                        if (isClickScrolling) return;
                        gsap.utils.toArray(".wrap").forEach((el) => el.classList.remove("active"));
                        wrap.classList.add("active");
                    },
                    onLeave: () => {
                        if (isClickScrolling) return;
                        wrap.classList.remove("active");
                    },
                    onLeaveBack: () => {
                        if (isClickScrolling) return;
                        wrap.classList.remove("active");
                    },
                    invalidateOnRefresh: true,
                    // markers: true, //Debug
                });
                triggers.push(workTrigger);
            });

            let isClickScrolling = false;
            let clickScrollTimer = null;

            document.querySelectorAll('a[href^="#"]').forEach((a) => {
                a.addEventListener("click", () => {
                    isClickScrolling = true;

                    clearTimeout(clickScrollTimer);
                    clickScrollTimer = setTimeout(() => {
                        isClickScrolling = false;
                    }, 800);
                });
            });

            window.addEventListener("resize", () => {
                ScrollTrigger.refresh();
            });
        }

        scrollActive();
    };
    /* Draw Svg
    ---------------------------------------------------------- */
    var drawSvg = () => {
        if ($(".scribble-wrap").length > 0) {
            const path = document.getElementById("scribblePath");
            const svg = document.querySelector(".scribble");

            const len = path.getTotalLength();
            path.style.setProperty("--len", len);

            const io = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        svg.classList.add("is-drawn");
                        io.disconnect();
                    }
                },
                { threshold: 0.2 }
            );

            io.observe(svg);
        }
    };
    /*========== End - Scroll Orther Animation ==========*/

    /*== Start - Preload ==*/
    var loader = function () {
        if ($("#preload").length) {
            $(window).on("load", function () {
                $("#preload").fadeOut("slow", function () {
                    $(this).remove();
                    runAnimations();
                });
            });
        } else {
            runAnimations();
        }
    };

    /* Preloader
    -------------------------------------------------------------------------*/
    var loaderV2 = function () {
        $("#preload").fadeOut("slow", function () {
            var $this = $(this);
            setTimeout(function () {
                $this.remove();
            }, 300);
        });
    };
    var runAnimations = () => {
        /*-- Scroll Text --*/
        animation_text();
        scrolling_effect();

        /*-- Scroll Orther --*/
        scrollLine();
        techProgress();
        service();
        gsapA2();
        scrollEffectFade();
        drawSvg();
    };
    /*== End - Preload ==*/

    $(function () {
        runAnimations();
        loaderV2();
    });
})(jQuery);
