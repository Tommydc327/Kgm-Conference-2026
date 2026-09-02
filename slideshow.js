// ---------------------------------------------------------------------------
// Logo + hero photo slideshow
//
// To add your real logo: upload a file named exactly "logo.png" to the same
// GitHub folder as index.html. Any image works even if not square — it'll
// be scaled to fit.
//
// To add your own photos: upload files named slide1.jpg, slide2.jpg, up to
// slide4.jpg (see SLIDE_COUNT below) to that same folder. To show more or
// fewer photos, just change the number below.
//
// Until real files are uploaded, this shows tasteful placeholders instead
// of broken image icons.
// ---------------------------------------------------------------------------
var SLIDE_COUNT = 3;
var AUTO_ADVANCE_MS = 5000;

(function () {
  // Logo fallback
  var logoWrap = document.getElementById("logoWrap");
  var logoImg = document.getElementById("logoImg");
  if (logoWrap && logoImg) {
    logoImg.onerror = function () {
      logoWrap.classList.add("logo-fallback");
      logoImg.remove();
    };
  }

  // Slideshow
  var track = document.getElementById("slideTrack");
  var dotsWrap = document.getElementById("slideDots");
  if (!track || !dotsWrap) return;

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var slides = [];
  var dots = [];

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      s.classList.toggle("active", i === current);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle("active", i === current);
    });
    restartTimer();
  }

  function next() {
    goTo(current + 1);
  }

  function restartTimer() {
    if (timer) clearInterval(timer);
    if (!prefersReducedMotion) {
      timer = setInterval(next, AUTO_ADVANCE_MS);
    }
  }

  var current = 0;
  var timer = null;

  for (var i = 1; i <= SLIDE_COUNT; i++) {
    (function (num) {
      var slide = document.createElement("div");
      slide.className = "slide";
      slide.setAttribute("data-slide-num", num);

      var img = document.createElement("img");
      img.src = "slide" + num + ".jpg";
      img.alt = "";
      img.loading = num === 1 ? "eager" : "lazy";
      img.onerror = function () {
        slide.classList.add("slide-fallback");
        img.remove();
      };
      slide.appendChild(img);
      track.appendChild(slide);
      slides.push(slide);

      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.setAttribute("aria-label", "Go to photo " + num);
      dot.addEventListener("click", function () {
        goTo(num - 1);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    })(i);
  }

  // Swipe support
  var touchStartX = null;
  track.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  track.addEventListener("touchend", function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else goTo(current - 1);
    }
    touchStartX = null;
  });

  goTo(0);
})();
