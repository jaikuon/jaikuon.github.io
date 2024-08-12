document.addEventListener("DOMContentLoaded", function() {
    const imageFolder = 'image/animanga/';
    const images = [
        'f1.gif',
        "f2.gif",
        "f3.gif",
        "f4.gif",
        "f5.gif",
        "f6.gif",
        "f7.gif",
        "f8.gif",
        "f9.gif",
        "f10.gif",
        "f11.gif",
        "0.gif",
        "ds1.gif",
        "ds2.gif",
        "ds3.gif",
        "ds4.gif",
        "j1.gif",
        "j2.gif",
        "j3.gif",
        "j4.gif",
        "j5.gif",
        "j6.gif",
        "cs1.gif",
        "cs2.gif",
        "cs3.gif",
        "cs4.gif",
        "fma1.gif",
        "fma2.gif",
        "fma3.gif",
        "fma3.gif",
        "fma4.gif",
        "fma5.gif",
        "fma6.gif",
        "fma7.gif",
        "s1.gif",
        "s2.gif",
        "s3.gif",
        "s4.gif",
        "s5.gif",
        "s6.gif",
        "s7.gif",
        "s8.gif",
        "s9.gif",
        "ab1.gif",
        "ab2.gif",
        "ab3.gif",
        "ab4.gif",
        "ab5.gif",
        "ab6.gif",
        "r1.gif",
        "r2.gif",
        "r3.gif",
        "r4.gif"
       
    ];

    function getRandomImage() {
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    }

    function displayRandomImage() {
        const randomImage = getRandomImage();
        const imgElement = document.createElement('img');
        imgElement.src = imageFolder + randomImage;
        imgElement.alt = 'Random Image';
        imgElement.style.width = 'auto';
        imgElement.style.height = '300px';

        const container = document.getElementById('randomImageContainer');
        container.appendChild(imgElement);
    }

    displayRandomImage();
});