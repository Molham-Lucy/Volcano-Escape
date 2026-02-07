export class Assets {
    constructor() {
        this.images = {};
        this.data = {};
    }

    async loadImage(name, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.onerror = (e) => reject(`Failed to load image: ${src}`);
            img.src = src;
        });
    }

    async loadText(name, src) {
        try {
            const response = await fetch(src);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            this.data[name] = text;
            return text;
        } catch (e) {
            console.error(`Failed to load text: ${src}`, e);
            throw e;
        }
    }

    getImage(name) {
        return this.images[name];
    }

    getData(name) {
        return this.data[name];
    }
}
