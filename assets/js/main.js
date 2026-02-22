/**
 * Infinite Slide
 * Update Clock
 * Setting Color
 * Counter
 * Cursor Image Hover
 * Switch Mode
 * Text Rotate
 * Draw Svg
 * Active Class
 * Wrap Active
 * Animation Text Typing
 * Scroll Link
 * Handle Open Menu
 */

(function ($) {
    "use strict";
    /* Infinite Slide 
    ---------------------------------------------------------- */
    var infiniteSlide = function () {
        if ($(".infiniteSlide").length > 0) {
            $(".infiniteSlide").each(function () {
                var $this = $(this);
                var style = $this.data("style") || "left";
                var clone = $this.data("clone") || 2;
                var speed = $this.data("speed") || 50;
                $this.infiniteslide({
                    speed: speed,
                    direction: style,
                    clone: clone,
                    pauseonhover: true,
                });
            });
        }
    };

    /* Update Clock
    ---------------------------------------------------------- */
    var updateClock = () => {
        function startClocks(container = ".time-local") {
            function updateClock() {
                const now = new Date();

                const timeString = now.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                });

                const dateString = now.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                });

                document.querySelectorAll(container).forEach((el) => {
                    const dateEl = el.querySelector(".date");
                    const clockEl = el.querySelector(".clock");

                    if (dateEl) dateEl.textContent = dateString;
                    if (clockEl) clockEl.textContent = timeString;
                });
            }

            updateClock();
            setInterval(updateClock, 1000);
        }

        startClocks(".time-local");
    };

    /* Setting Color
    ---------------------------------------------------------- */
    const settingColor = () => {
        if (!$(".settings-color").length) return;

        const buttons = document.querySelectorAll(".choose-item");
        const body = document.body;

        buttons.forEach((btn, index) => {
            btn.addEventListener("click", () => {
                const isLight = btn.classList.contains("theme-light");
                const num = (index % 3) + 1;
                const bodyClass = `${isLight ? "body-v" : "dark-v"}${num}`;
                const sameGroupSelector = `.choose-item.${isLight ? "theme-light" : "theme-dark"}`;

                if (btn.classList.contains("active")) {
                    btn.classList.remove("active");
                    body.classList.remove(bodyClass);
                    return;
                }

                document.querySelectorAll(sameGroupSelector).forEach((b) => b.classList.remove("active"));

                btn.classList.add("active");

                body.classList.forEach((cls) => {
                    if (cls.startsWith(isLight ? "body-v" : "dark-v")) {
                        body.classList.remove(cls);
                    }
                });

                body.classList.add(bodyClass);
            });
        });
    };

    /* Counter
    ---------------------------------------------------------- */
    var counter = function () {
        if ($(document.body).hasClass("counter-scroll")) {
            function isInViewport(el) {
                var rect = el.getBoundingClientRect();
                return rect.top < window.innerHeight && rect.bottom > 0;
            }

            function startCount($el) {
                if ($().countTo) {
                    $el.find(".number").each(function () {
                        var to = $(this).data("to"),
                            speed = $(this).data("speed");
                        $(this).countTo({
                            to: to,
                            speed: speed,
                        });
                    });
                }
            }

            $(".counter").each(function () {
                $(this).data("started", false);
            });

            function checkAndStart() {
                $(".counter").each(function () {
                    var $this = $(this);
                    var started = $this.data("started");

                    if (!started && isInViewport(this)) {
                        startCount($this);
                        $this.data("started", true);
                    }
                });
            }

            checkAndStart();
            $(window).on("scroll resize", checkAndStart);
        }
    };

    /* Cursor Image Hover
    ---------------------------------------------------------- */
    var hoverImgCursor = function () {
        let offsetX = 20;
        let offsetY = 20;
        $(".hover-cursor-img").on("mousemove", function (e) {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                top: e.clientY + offsetY + "px",
                left: e.clientX + offsetX + "px",
            });
        });

        $(".hover-cursor-img").on("mouseenter", function () {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                transform: "scale(1)",
                opacity: 1,
            });
        });

        $(".hover-cursor-img").on("mouseleave", function () {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                transform: "scale(0)",
                opacity: 0,
            });
        });
    };

    /* Switch Mode
    ---------------------------------------------------------- */
    const switchMode = () => {
        const $toggles = $(".toggle-switch-mode");
        const $body = $("body");
        const $logoHeader = $(".image-switch");
        const $logoMobile = $("#logo_mode");

        if (!$toggles.length) return;

        $logoHeader.each(function () {
            const $this = $(this);
            if (!$this.data("light-original")) {
                $this.data("light-original", $this.attr("src"));
            }
        });

        if ($logoMobile.length && !$logoMobile.data("light-original")) {
            $logoMobile.data("light-original", $logoMobile.attr("src"));
        }

        const applyLogo = (isDark) => {
            $logoHeader.each(function () {
                const $this = $(this);
                const lightSrc = $this.data("light-original");
                const darkSrc = $this.data("dark");
                $this.attr("src", isDark && darkSrc ? darkSrc : lightSrc);
            });

            if ($logoMobile.length) {
                const lightSrc = $logoMobile.data("light-original");
                const darkSrc = $logoMobile.data("dark");
                $logoMobile.attr("src", isDark && darkSrc ? darkSrc : lightSrc);
            }
        };

        const updateToggles = (isDark) => {
            $toggles.each(function () {
                $(this).toggleClass("active", isDark);
            });
        };

        const savedMode = localStorage.getItem("darkMode");
        const defaultMode = $body.data("default-mode");

        let isDarkInitially;

        if (typeof defaultMode !== "undefined") {
            isDarkInitially = defaultMode === "dark";
        } else if (savedMode !== null) {
            isDarkInitially = savedMode === "enabled";
        } else {
            isDarkInitially = false;
        }

        $body.toggleClass("dark-mode", isDarkInitially);
        applyLogo(isDarkInitially);
        updateToggles(isDarkInitially);

        $toggles.on("click", function () {
            const isDark = !$body.hasClass("dark-mode");

            $body.toggleClass("dark-mode", isDark);
            updateToggles(isDark);
            applyLogo(isDark);

            localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
        });
    };

    /* Text Rotate
    ---------------------------------------------------------- */
    var textRotate = function () {
        if ($(".wg-curve-text").length > 0) {
            if ($(".text-rotate").length > 0) {
                const text = "award winning agency - since 2022 -";
                const chars = text.split("");
                const degree = 360 / chars.length;

                $(".text-rotate .text").each(function () {
                    const $circularText = $(this);
                    $circularText.empty();
                    chars.forEach((char, i) => {
                        const $span = $("<span></span>")
                            .text(char)
                            .css({
                                transform: `rotate(${i * degree}deg)`,
                            });
                        $circularText.append($span);
                    });
                });
            }
        }
    };

    /* Active Class
    ---------------------------------------------------------- */
    var activeClass = () => {
        function checkInView() {
            const elements = document.querySelectorAll(".intro-title span");

            elements.forEach((el) => {
                if (el.classList.contains("active")) return;

                const rect = el.getBoundingClientRect();
                const inView = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;

                if (inView) {
                    setTimeout(() => {
                        el.classList.add("active");
                    }, 300);
                }
            });
        }

        window.addEventListener("scroll", checkInView);
        window.addEventListener("load", checkInView);
    };

    /* Wrap Active
    ---------------------------------------------------------- */
    var wrapActive = () => {
        $(window).on("scroll", function () {
            $(".wrap-hover-award").each(function () {
                let $this = $(this);
                let top = $this.offset().top;
                let bottom = top + $this.outerHeight();
                let scrollTop = $(window).scrollTop();
                let windowBottom = scrollTop + $(window).height();

                if (bottom > scrollTop && top < windowBottom) {
                    $this.addClass("active");
                } else {
                    $this.removeClass("active");
                }
            });
        });
    };

    /* Animation Text Typing
    ---------------------------------------------------------- */
    var textTyping = () => {
        if ($(".text-typing").length > 0) {
            const words = ["Isak", "Designer", "Developer"];
            const typedEl = document.getElementById("typed");

            let wordIndex = 0;
            let charIndex = 0;
            let deleting = false;

            const typeSpeed = 100;
            const deleteSpeed = 50;
            const delayBetweenWords = 1200;

            function type() {
                const currentWord = words[wordIndex];

                if (!deleting) {
                    typedEl.textContent = currentWord.slice(0, ++charIndex);

                    if (charIndex === currentWord.length) {
                        deleting = true;
                        setTimeout(type, delayBetweenWords);
                        return;
                    }
                } else {
                    typedEl.textContent = currentWord.slice(0, --charIndex);

                    if (charIndex === 0) {
                        deleting = false;
                        wordIndex = (wordIndex + 1) % words.length;
                    }
                }

                setTimeout(type, deleting ? deleteSpeed : typeSpeed);
            }

            type();
        }
    };

    /* Scroll Link
    ---------------------------------------------------------- */
    var scrollLink = function () {
        let sectionIds = $("a.scroll-link");
        $(document).on("scroll", function () {
            sectionIds.each(function () {
                let container = $(this).attr("href");

                if (!container || container === "#") return;

                if (!$(container).length) return;

                let containerOffset = $(container).offset().top;
                let containerHeight = $(container).outerHeight();
                let containerBottom = containerOffset + containerHeight;
                let scrollPosition = $(document).scrollTop();

                if (scrollPosition < containerBottom - 20 && scrollPosition >= containerOffset - 20) {
                    $(this).addClass("active");
                } else {
                    $(this).removeClass("active");
                }
            });
        });
    };

    /* Handle Open Menu
    ---------------------------------------------------------- */
    var handleOpenNav = () => {
        $(".action-open-mobile, .overlay-pop").on("click", function () {
            $(".nav-mobile-list, .overlay-pop").toggleClass("open");
            $("body").toggleClass("overflow-hidden");
            $(".btn-mobile-menu").toggleClass("close");
        });
    };

    /* Contact Form
    ---------------------------------------------------------- */
    var ajaxContactForm = function () {
        $("#contactform").each(function () {
            $(this).validate({
                submitHandler: function (form) {
                    var $form = $(form),
                        str = $form.serialize(),
                        loading = $("<div />", { class: "loading" });

                    $.ajax({
                        type: "POST",
                        url: $form.attr("action"),
                        data: str,
                        beforeSend: function () {
                            $form.find(".send-wrap").append(loading);
                        },
                        success: function (msg) {
                            var result, cls;
                            if (msg === "Success") {
                                result = "Email Sent Successfully. Thank you, Your application is accepted - we will contact you shortly";
                                cls = "msg-success";
                            } else {
                                result = "Error sending email.";
                                cls = "msg-error";
                            }
                            $form.prepend(
                                $("<div />", {
                                    class: "flat-alert " + cls,
                                    text: result,
                                }).append($('<a class="close" href="#"><i class="icon icon-close2"></i></a>'))
                            );

                            $form.find(":input").not(".submit").val("");
                        },
                        complete: function (xhr, status, error_thrown) {
                            $form.find(".loading").remove();
                        },
                    });
                },
            });
        }); // each contactform
    };

    
    // Dom Ready
    $(function () {
        ajaxContactForm();
        scrollLink();
        textRotate();
        infiniteSlide();
        updateClock();
        counter();
        settingColor();
        hoverImgCursor();
        switchMode();
        activeClass();
        wrapActive();
        textTyping();
        handleOpenNav();
    });
})(jQuery);
