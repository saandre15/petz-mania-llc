export const scrollSlider = () => {
  const options = {
    root: null,
    rootMargin: '-50% 0px',
    threshold: [0.0 ,1.0],
  };
  let percent = 0;  
  const logic = (entries, observer) => {
    entries.forEach(entry => {
        let el = entry.target;
        console.log(entry);
        if(entry.isIntersecting === true) {
          document.body.addEventListener('wheel', (e) => {
            if(percent === 0) {
              if(e.deltaY > 0) {
                e.preventDefault();
                percent++;
                el.style.transfrom = `translateX(-${percent}%)`;
              } else {
                e.preventDefault();
                return;
              }
            } else if(percent === 75) {
              observer.disconnect();
              return;
            } else {
              e.preventDefault();
              e.deltaY > 0 ? percent++ : percent--;
              el.style.transform = `translateX(-${percent}%)`;
            }
          });
          let starty = 0;
          let previousDist = 0;
          let dist = 0;
          document.body.addEventListener('touchstart' , (e) => {
            const touch = e.changedTouches[0];
            starty = parseInt(touch.clientY);
          }, {
            passive: false
          });
          document.body.addEventListener('touchmove', (e) => {
            const touch = e.changedTouches[0];
            dist = parseInt(touch.clientY) - starty;
            let move = (dist - previousDist) * 0.01;
            if(percent === 0) {
              if(dist < 0) {
                e.preventDefault();
                percent++;
                el.style.transform = `translateX(-${percent}%)`;
                
              } else {
                e.preventDefault();
                return;
              }
            } else if(percent === 75) {
              observer.disconnect();
            } else {
              e.preventDefault();
              move < 0 ? percent++ : percent--;
              el.style.transform = `translateX(-${percent}%)`;
              
            }
            previousDist = dist;
          }, {
            passive: false,
          });
          window.location.hash = 'feature';
        }
      }
    );
  }
  return new IntersectionObserver(logic, options);
}