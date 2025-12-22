// src/components/ticket/ImageCarousel.jsx
import React, { useState } from 'react';
import styles from './ticketComments.module.css';

const ImageCarousel = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  // Calculate responsive image dimensions
  const calculateImageDimensions = (image) => {
    const maxWidth = 400;
    const maxHeight = 300;
    
    if (!image.image_width || !image.image_height) {
      return { width: maxWidth, height: 'auto' };
    }

    const ratio = Math.min(maxWidth / image.image_width, maxHeight / image.image_height);
    return {
      width: Math.floor(image.image_width * ratio),
      height: Math.floor(image.image_height * ratio)
    };
  };

  const currentImage = images[currentIndex];
  const dimensions = calculateImageDimensions(currentImage);

  return (
    <div className={styles.imageCarousel}>
      <div className={styles.imageContainer}>
        <img
          src={currentImage.download_url}
          alt={currentImage.original_filename}
          className={styles.carouselImage}
          style={dimensions}
          onClick={() => onImageClick && onImageClick(currentImage, currentIndex)}
        />
        
        {images.length > 1 && (
          <>
            <button
              className={`${styles.carouselButton} ${styles.carouselButtonPrev}`}
              onClick={prevImage}
              type="button"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              className={`${styles.carouselButton} ${styles.carouselButtonNext}`}
              onClick={nextImage}
              type="button"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            
            <div className={styles.carouselIndicators}>
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.carouselIndicator} ${
                    index === currentIndex ? styles.carouselIndicatorActive : ''
                  }`}
                  onClick={() => goToImage(index)}
                  type="button"
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {images.length > 1 && (
        <div className={styles.imageCounter}>
          {currentIndex + 1} of {images.length}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;