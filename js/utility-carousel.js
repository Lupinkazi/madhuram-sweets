/**
 * Utility Bar Carousel for Mobile
 * Auto-rotates through contact info items with smooth manual swipe support
 * Each slide shows ONE piece of information: Phone, Email, or Hours
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    ROTATION_INTERVAL: 6000,     // 6 seconds per slide
    SWIPE_THRESHOLD: 30,         // Minimum pixels to trigger swipe
    TRANSITION_DURATION: 500,    // Animation duration in ms
    MIN_SCREEN_WIDTH: 768        // Disable carousel on screens >= 768px
  };

  // Check if mobile/tablet
  function isMobile() {
    return window.innerWidth < CONFIG.MIN_SCREEN_WIDTH;
  }

  if (!isMobile()) return;

  // DOM Elements
  const utilityBar = document.querySelector('.utility-bar');
  const utilityInner = document.querySelector('.utility-inner');
  const utilityList = document.querySelector('.utility-list');
  const utilityItems = document.querySelectorAll('.utility-list > li');
  
  if (!utilityBar || !utilityList || utilityItems.length === 0) return;

  // State
  let state = {
    currentIndex: 0,
    autoRotateInterval: null,
    isDragging: false,
    startX: 0,
    currentX: 0,
    startTime: 0,
    isTransitioning: false
  };

  // Create carousel wrapper for better control
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'utility-carousel-wrapper';
  carouselWrapper.style.cssText = `
    position: relative;
    width: 100%;
    overflow: hidden;
  `;

  // Wrap the utility list
  utilityInner.insertBefore(carouselWrapper, utilityList);
  carouselWrapper.appendChild(utilityList);

  // Create indicators container
  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.className = 'utility-indicators';
  indicatorsContainer.setAttribute('role', 'tablist');
  indicatorsContainer.setAttribute('aria-label', 'Contact information carousel');

  // Create indicator buttons
  const indicators = [];
  utilityItems.forEach((item, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'utility-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-label', `Show contact ${index + 1} of ${utilityItems.length}`);
    indicator.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    indicator.setAttribute('tabindex', index === 0 ? '0' : '-1');
    if (index === 0) indicator.classList.add('active');
    
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      goToSlide(index);
      resetAutoRotate();
    });
    
    indicators.push(indicator);
    indicatorsContainer.appendChild(indicator);
  });

  utilityBar.appendChild(indicatorsContainer);

  // Update slide position with smooth animation
  function updateSlide(instant = false) {
    if (state.isTransitioning && !instant) return;

    state.isTransitioning = !instant;
    
    const offset = -state.currentIndex * 100;
    utilityList.style.transition = instant 
      ? 'none' 
      : `transform ${CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    utilityList.style.transform = `translate3d(${offset}%, 0, 0)`;
    
    // Update indicators
    indicators.forEach((indicator, index) => {
      const isActive = index === state.currentIndex;
      indicator.classList.toggle('active', isActive);
      indicator.setAttribute('aria-selected', isActive ? 'true' : 'false');
      indicator.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Clear transitioning flag after animation
    if (!instant) {
      setTimeout(() => {
        state.isTransitioning = false;
      }, CONFIG.TRANSITION_DURATION);
    }
  }

  // Navigate to specific slide
  function goToSlide(index) {
    if (state.isTransitioning) return;
    
    // Wrap around
    if (index < 0) index = utilityItems.length - 1;
    if (index >= utilityItems.length) index = 0;
    
    state.currentIndex = index;
    updateSlide();
  }

  // Navigation functions
  function nextSlide() {
    goToSlide(state.currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(state.currentIndex - 1);
  }

  // Auto-rotate functionality
  function startAutoRotate() {
    stopAutoRotate(); // Clear any existing interval
    state.autoRotateInterval = setInterval(nextSlide, CONFIG.ROTATION_INTERVAL);
  }

  function stopAutoRotate() {
    if (state.autoRotateInterval) {
      clearInterval(state.autoRotateInterval);
      state.autoRotateInterval = null;
    }
  }

  function resetAutoRotate() {
    stopAutoRotate();
    startAutoRotate();
  }

  // Touch/Swipe event handlers
  function handleTouchStart(e) {
    if (state.isTransitioning) return;
    
    state.isDragging = true;
    state.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    state.currentX = state.startX;
    state.startTime = Date.now();
    
    stopAutoRotate();
    utilityList.style.transition = 'none';
    carouselWrapper.style.cursor = 'grabbing';
  }

  function handleTouchMove(e) {
    if (!state.isDragging) return;
    
    // Prevent default to stop page scrolling
    if (e.cancelable) {
      e.preventDefault();
    }
    
    state.currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const diff = state.currentX - state.startX;
    const percentage = (diff / carouselWrapper.offsetWidth) * 100;
    const offset = -state.currentIndex * 100 + percentage;
    
    // Apply transform with boundary checking
    const maxOffset = 0;
    const minOffset = -(utilityItems.length - 1) * 100;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, offset));
    
    utilityList.style.transform = `translate3d(${clampedOffset}%, 0, 0)`;
  }

  function handleTouchEnd(e) {
    if (!state.isDragging) return;
    
    state.isDragging = false;
    carouselWrapper.style.cursor = 'grab';
    
    const diff = state.currentX - state.startX;
    const timeDiff = Date.now() - state.startTime;
    const velocity = Math.abs(diff) / timeDiff; // pixels per ms
    
    // Determine if swipe was intentional
    const isSwipe = Math.abs(diff) > CONFIG.SWIPE_THRESHOLD || velocity > 0.3;
    
    if (isSwipe) {
      if (diff > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    } else {
      // Snap back to current slide
      updateSlide();
    }
    
    resetAutoRotate();
  }

  // Event listeners - Touch events
  carouselWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
  carouselWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
  carouselWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
  carouselWrapper.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  // Event listeners - Mouse events (for testing on desktop)
  carouselWrapper.addEventListener('mousedown', handleTouchStart);
  carouselWrapper.addEventListener('mousemove', handleTouchMove);
  carouselWrapper.addEventListener('mouseup', handleTouchEnd);
  carouselWrapper.addEventListener('mouseleave', (e) => {
    if (state.isDragging) {
      handleTouchEnd(e);
    }
  });

  // Prevent click on links during drag
  utilityList.addEventListener('click', (e) => {
    if (Math.abs(state.currentX - state.startX) > 10) {
      e.preventDefault();
    }
  }, true);

  // Pause on hover (desktop)
  utilityBar.addEventListener('mouseenter', () => {
    if (isMobile()) stopAutoRotate();
  });
  
  utilityBar.addEventListener('mouseleave', () => {
    if (isMobile()) startAutoRotate();
  });

  // Pause when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoRotate();
    } else if (isMobile()) {
      startAutoRotate();
    }
  });

  // Keyboard navigation
  indicatorsContainer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevSlide();
      resetAutoRotate();
      indicators[state.currentIndex].focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextSlide();
      resetAutoRotate();
      indicators[state.currentIndex].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
      resetAutoRotate();
      indicators[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(utilityItems.length - 1);
      resetAutoRotate();
      indicators[utilityItems.length - 1].focus();
    }
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!isMobile()) {
        // Switch to desktop view
        stopAutoRotate();
        utilityList.style.transform = 'none';
        utilityList.style.transition = 'none';
        indicatorsContainer.style.display = 'none';
        carouselWrapper.style.overflow = 'visible';
      } else {
        // Ensure mobile view is correct
        indicatorsContainer.style.display = 'flex';
        carouselWrapper.style.overflow = 'hidden';
        updateSlide(true);
        if (!state.autoRotateInterval) startAutoRotate();
      }
    }, 250);
  });

  // Cursor styling
  carouselWrapper.style.cursor = 'grab';
  carouselWrapper.style.userSelect = 'none';
  carouselWrapper.style.WebkitUserSelect = 'none';
  carouselWrapper.style.touchAction = 'pan-y pinch-zoom';

  // Initialize
  updateSlide(true);
  startAutoRotate();

  // Log for debugging (remove in production)
  console.log(`📱 Utility Carousel initialized with ${utilityItems.length} slides`);

})();
