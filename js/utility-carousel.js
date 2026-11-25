/**
 * Utility Bar Carousel for Mobile
 * Auto-rotates through contact info items with manual swipe support
 */

(function() {
  'use strict';

  // Only run on mobile/tablet screens
  if (window.innerWidth >= 768) return;

  const utilityBar = document.querySelector('.utility-bar');
  const utilityList = document.querySelector('.utility-list');
  const utilityItems = document.querySelectorAll('.utility-list > li');
  
  if (!utilityBar || !utilityList || utilityItems.length === 0) return;

  let currentIndex = 0;
  let autoRotateInterval;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const ROTATION_INTERVAL = 6000; // 6 seconds
  const SWIPE_THRESHOLD = 50; // pixels

  // Create indicators container
  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.className = 'utility-indicators';
  indicatorsContainer.setAttribute('role', 'tablist');
  indicatorsContainer.setAttribute('aria-label', 'Contact information carousel');

  // Create indicator buttons
  utilityItems.forEach((_, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'utility-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-label', `Show item ${index + 1}`);
    indicator.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    if (index === 0) indicator.classList.add('active');
    
    indicator.addEventListener('click', () => {
      goToSlide(index);
      resetAutoRotate();
    });
    
    indicatorsContainer.appendChild(indicator);
  });

  utilityBar.style.position = 'relative';
  utilityBar.appendChild(indicatorsContainer);

  // Update slide position
  function updateSlide(instant = false) {
    const offset = -currentIndex * 100;
    utilityList.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    utilityList.style.transform = `translateX(${offset}%)`;
    
    // Update indicators
    document.querySelectorAll('.utility-indicator').forEach((indicator, index) => {
      if (index === currentIndex) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-selected', 'true');
      } else {
        indicator.classList.remove('active');
        indicator.setAttribute('aria-selected', 'false');
      }
    });

    // Update ARIA live region for screen readers
    const currentItem = utilityItems[currentIndex];
    if (currentItem) {
      utilityBar.setAttribute('aria-live', 'polite');
      utilityBar.setAttribute('aria-atomic', 'true');
    }
  }

  // Go to specific slide
  function goToSlide(index) {
    currentIndex = index;
    if (currentIndex < 0) currentIndex = utilityItems.length - 1;
    if (currentIndex >= utilityItems.length) currentIndex = 0;
    updateSlide();
  }

  // Next slide
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  // Previous slide
  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // Auto-rotate functionality
  function startAutoRotate() {
    autoRotateInterval = setInterval(nextSlide, ROTATION_INTERVAL);
  }

  function stopAutoRotate() {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      autoRotateInterval = null;
    }
  }

  function resetAutoRotate() {
    stopAutoRotate();
    startAutoRotate();
  }

  // Touch/Mouse events for manual swiping
  function handleStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    currentX = startX;
    stopAutoRotate();
    utilityList.style.transition = 'none';
  }

  function handleMove(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const diff = currentX - startX;
    const offset = -currentIndex * 100 + (diff / utilityList.offsetWidth) * 100;
    utilityList.style.transform = `translateX(${offset}%)`;
  }

  function handleEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    const diff = currentX - startX;
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    } else {
      updateSlide();
    }
    
    resetAutoRotate();
  }

  // Add event listeners
  utilityList.addEventListener('touchstart', handleStart, { passive: false });
  utilityList.addEventListener('touchmove', handleMove, { passive: false });
  utilityList.addEventListener('touchend', handleEnd);
  
  utilityList.addEventListener('mousedown', handleStart);
  utilityList.addEventListener('mousemove', handleMove);
  utilityList.addEventListener('mouseup', handleEnd);
  utilityList.addEventListener('mouseleave', () => {
    if (isDragging) handleEnd();
  });

  // Pause on hover (desktop)
  utilityBar.addEventListener('mouseenter', stopAutoRotate);
  utilityBar.addEventListener('mouseleave', startAutoRotate);

  // Pause when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoRotate();
    } else {
      startAutoRotate();
    }
  });

  // Keyboard navigation
  indicatorsContainer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
      resetAutoRotate();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      resetAutoRotate();
    }
  });

  // Initialize
  updateSlide(true);
  startAutoRotate();

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth >= 768) {
        // Switch back to desktop view
        stopAutoRotate();
        utilityList.style.transform = 'none';
        utilityList.style.transition = 'none';
        indicatorsContainer.style.display = 'none';
      } else {
        // Ensure mobile view is correct
        indicatorsContainer.style.display = 'flex';
        updateSlide(true);
        if (!autoRotateInterval) startAutoRotate();
      }
    }, 250);
  });

  // Add CSS for better touch interaction
  utilityList.style.cursor = 'grab';
  utilityList.addEventListener('mousedown', () => {
    utilityList.style.cursor = 'grabbing';
  });
  utilityList.addEventListener('mouseup', () => {
    utilityList.style.cursor = 'grab';
  });

})();
