/* ==========================================================================
   1. TYPEWRITER EFFECT (Hero Section)
   ========================================================================== */
function initTypewriter() {
    const texts = ["anonymous", "untrackable", "annoying", "unrestricted", "anything"];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typewriterElement = document.getElementById("typewriter");

    if (!typewriterElement) return;

    function typeEffect() {
        const currentText = texts[textIndex];

        if (!isDeleting) {
            typewriterElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentText.length) {
                isDeleting = true;
                setTimeout(typeEffect, 2000);
                return;
            }
        } else {
            typewriterElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
            }
        }
        setTimeout(typeEffect, isDeleting ? 50 : 100);
    }
    typeEffect();
}

/* ==========================================================================
   2. GLOBAL INITIALIZATIONS (Emojis, Nav, & Smooth Scroll)
   ========================================================================== */
function initGlobals() {
    if (window.twemoji) {
        twemoji.parse(document.body, { folder: "svg", ext: ".svg" });
    }

    // Smooth Scroll
    document.querySelectorAll('.nav-list a').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#') && targetId !== '#') {
                e.preventDefault();
                document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Mobile Hamburger Menu Setup
    const hamburger = document.getElementById('hamburger');
    const navList = document.getElementById('navList');

    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navList.classList.toggle('active');
        });

        // Close dropdown when a link is clicked
        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
            });
        });
    }
}

/* ==========================================================================
   3. ABOUT SECTION (Responsive Logic & Click Events)
   ========================================================================== */
function initAboutSection() {
    const capsule = document.querySelector('.over');
    const items = document.querySelectorAll('#aboutList li');
    const cards = document.querySelectorAll('.card');
    const container = document.querySelector('.about-cont');
    const rightBox = document.getElementById('aboutRightBox');

    if (!capsule || !container) return;

    let currentIndex = -1;
    let isScrolling = false;

    // Desktop UI updater
    function updateDesktopUI(index) {
        if (currentIndex === index) return;
        currentIndex = index;

        const targetItem = items[index];
        if (targetItem) {
            capsule.style.top = `${targetItem.offsetTop}px`;
            capsule.style.left = `${targetItem.offsetLeft}px`;
            capsule.style.width = `${targetItem.offsetWidth}px`;
            capsule.style.height = `${targetItem.offsetHeight}px`;
        }

        items.forEach((item, i) => item.classList.toggle('active', i === index));

        cards.forEach((card, i) => {
            if (i < index) {
                card.style.transform = `translate(-50%, -150%) rotate(-15deg)`;
                card.style.opacity = "0";
            } else {
                let relativeIndex = i - index;
                card.style.transform = `translate(-50%, -50%) rotate(${-relativeIndex * 12}deg) scale(${1 - relativeIndex * 0.04})`;
                card.style.opacity = "1";
                card.style.zIndex = cards.length - i;
            }
        });
    }

    // Window Scroll Tracker (Desktop Only)
    window.addEventListener('scroll', () => {
        if (!isScrolling && window.innerWidth > 768) {
            window.requestAnimationFrame(() => {
                const rect = container.getBoundingClientRect();
                if (rect.top > 0) {
                    updateDesktopUI(0);
                } else {
                    const dynamicScrollThreshold = window.innerHeight * 0.5;
                    const scrolledInside = Math.abs(rect.top);
                    let activeIndex = Math.floor((scrolledInside + 10) / dynamicScrollThreshold);
                    updateDesktopUI(Math.max(0, Math.min(items.length - 1, activeIndex)));
                }
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    // Horizontal Scroll Tracker (Mobile Only)
    if (rightBox) {
        rightBox.addEventListener('scroll', () => {
            if (window.innerWidth <= 768) {
                const scrollLeft = rightBox.scrollLeft;
                const cardWidth = rightBox.offsetWidth * 0.85; // matches flex: 0 0 85%
                const activeIndex = Math.round(scrollLeft / cardWidth);
                
                items.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
            }
        });
    }

    // --- CLICK TO SCROLL LOGIC RESTORED & ENHANCED ---
    items.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                // Desktop: Scroll page vertically down to the corresponding card threshold
                const dynamicScrollThreshold = window.innerHeight * 0.5;
                const containerAbsoluteTop = window.scrollY + container.getBoundingClientRect().top;
                window.scrollTo({
                    top: containerAbsoluteTop + (index * dynamicScrollThreshold) + 10,
                    behavior: 'smooth'
                });
            } else {
                // Mobile: Swipe the right box horizontally to the corresponding card
                if (rightBox) {
                    const cardWidth = rightBox.offsetWidth * 0.85; // matches flex: 0 0 85% gap included via offset
                    // To account for gap/padding, calculating rough scroll position
                    const targetScroll = index * (cardWidth + 20); // 20px is the gap
                    rightBox.scrollTo({
                        left: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Initialization
    document.fonts.ready.then(() => {
        if (window.innerWidth > 768) {
            capsule.style.transition = "none";
            updateDesktopUI(0);
            capsule.offsetHeight; // Force reflow
            capsule.style.transition = "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
        }
    });
}

/* ==========================================================================
   4. FEEDBACK FORM & TEAM EFFECTS
   ========================================================================== */
function initInteractiveElements() {
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".team"), {
            max: 15, speed: 400, glare: true, "max-glare": 0.2
        });
    }

    const actionBtn = document.getElementById('actionBtn');
    const mainContainer = document.getElementById('mainContainer');
    const textArea = document.querySelector('.feedback-form textarea');
    const starContainerParent = document.getElementById('starContainer');
    const starContainers = document.querySelectorAll('.star-container');

    if (!actionBtn || !mainContainer) return;

    actionBtn.addEventListener('click', () => {
        const isFormOpen = mainContainer.classList.contains('active');

        if (isFormOpen) {
            const activeStarCount = document.querySelectorAll('.star-container.active').length;
            if (activeStarCount === 0) return alert("PLEASE RANK BETWEEN 1 TO 5");

            alert("Feedback submitted successfully!");
            mainContainer.classList.remove('active');
            setTimeout(() => actionBtn.textContent = 'FEEDBACK', 150);

            if (textArea) textArea.value = '';
            starContainers.forEach(s => s.classList.remove('active'));
            starContainerParent.className = 'stars';
        } else {
            mainContainer.classList.add('active');
            setTimeout(() => actionBtn.textContent = 'SUBMIT', 150);
        }
    });

    starContainers.forEach((starDiv, index) => {
        starDiv.addEventListener('click', () => {
            const rating = index + 1;
            starContainers.forEach((s, i) => s.classList.toggle('active', i < rating));
            starContainerParent.className = `stars rating-${rating}`;
        });
    });
}

/* ==========================================================================
   5. GSAP ANIMATIONS (RESPONSIVE MATCH-MEDIA)
   ========================================================================== */
function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    let mm = gsap.matchMedia();

    // -- Runs on all screens --
    gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } })
        .to('.pill-text', { opacity: 1, y: 0, duration: 0.7 }, 0.1)
        .to('.main-text:nth-of-type(1)', { opacity: 1, y: 0, duration: 1.1 }, 0.3)
        .to('.main-text:nth-of-type(2)', { opacity: 1, y: 0, duration: 1.1 }, 0.45)
        .to('.start-btn', { opacity: 1, y: 0, duration: 0.8 }, 0.8);

    const bubbles = gsap.utils.toArray('.bubble');
    
    // -- Specific Desktop Animation Setup --
    mm.add("(min-width: 769px)", () => {
        
        // Pin Phone Track tightly for Desktop
        const phoneTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: ".phone-sticky",
                start: "top top",
                end: "+=500%",
                scrub: 1,
                pin: true,
            }
        });

        bubbles.forEach((bubble, index) => {
            phoneTimeline.to(bubble, { x: 0, opacity: 1, duration: 1, ease: "power2.out" }, index * 0.4);
        });

        const cardsStartTime = bubbles.length * 0.4 + 0.2;
        gsap.utils.toArray('.floating-card').forEach((card, index) => {
            phoneTimeline.to(card, { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, cardsStartTime + (index * 0.15));
        });

        // Desktop Feedback Pin
        const feedbackTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section-4",
                start: "top top", 
                end: "+=300%",
                pin: true,
                scrub: 1
            }
        });

        feedbackTl.from(".center-container", { y: 300, scale: 0.8, opacity: 0, duration: 1 })
            .from([".red-card", ".action-btn"], {
                scale: 0, opacity: 0, y: 50, duration: 0.8, ease: "back.out(1.5)", stagger: 0
            }, "-=0.5");
    });

    // -- Specific Mobile Animation Setup --
    mm.add("(max-width: 768px)", () => {
        // Unpinned faster phone track trigger for Mobile
        bubbles.forEach((bubble, index) => {
            gsap.to(bubble, {
                scrollTrigger: { trigger: ".phone-sticky", start: "top 70%" },
                x: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: index * 0.15
            });
        });

        // Simpler Feedback entrance
        gsap.from(".center-container", {
            scrollTrigger: { trigger: "#section-4", start: "top 80%" },
            y: 100, opacity: 0, duration: 0.8
        });
    });

    // -- Team wrapper animations (runs on both) --
    document.querySelectorAll('.team-wrapper').forEach((wrapper) => {
        const isLeft = wrapper.classList.contains('left');
        gsap.set(wrapper, { x: isLeft ? -50 : 50, scale: 0.8, opacity: 0 });

        gsap.to(wrapper, {
            scrollTrigger: {
                trigger: wrapper,
                start: "top 85%",
                end: "bottom 15%",
                toggleActions: "play reverse play reverse",
            },
            x: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power3.out"
        });
    });
}

/* ==========================================================================
   BOOTSTRAP APP
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initTypewriter();
    initGlobals();
    initAboutSection();
    initInteractiveElements();
});

window.addEventListener('load', initGSAP);