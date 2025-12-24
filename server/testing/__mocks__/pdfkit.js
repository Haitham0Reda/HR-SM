// Mock PDFKit to avoid Jest module resolution issues
import fs from 'fs';
import path from 'path';

class MockPDFDocument {
    constructor(options = {}) {
        this.options = options;
        this.content = [];
        this.currentFontSize = 12;
        this.currentY = 50;
        this.page = {
            height: 792,
            width: 612
        };
        this.writeStream = null;
    }

    pipe(stream) {
        this.writeStream = stream;
        return this;
    }

    fontSize(size) {
        this.currentFontSize = size;
        return this;
    }

    text(text, x, y, options = {}) {
        this.content.push({
            type: 'text',
            text,
            x,
            y,
            fontSize: this.currentFontSize,
            options
        });
        
        if (typeof y === 'number') {
            this.currentY = y + 20;
        } else if (typeof x === 'number') {
            this.currentY = x + 20;
        } else {
            this.currentY += 20;
        }
        
        return this;
    }

    moveDown(lines = 1) {
        this.currentY += lines * 20;
        return this;
    }

    addPage() {
        this.content.push({ type: 'page-break' });
        this.currentY = 50;
        return this;
    }

    end() {
        // Generate a mock PDF content
        const pdfContent = this.generateMockPDFContent();
        
        if (this.writeStream) {
            this.writeStream.write(pdfContent);
            this.writeStream.end();
            
            // Emit end event after a short delay to simulate async behavior
            setTimeout(() => {
                this.emit('end');
            }, 10);
        }
        
        return this;
    }

    generateMockPDFContent() {
        // Create a minimal valid PDF structure
        const header = '%PDF-1.4\n';
        const body = this.content.map(item => {
            if (item.type === 'text') {
                return `Text: ${item.text}`;
            } else if (item.type === 'page-break') {
                return 'Page Break';
            }
            return '';
        }).join('\n');
        
        const footer = '\n%%EOF';
        
        // Create a buffer that looks like a PDF
        const content = header + body + footer;
        const buffer = Buffer.from(content, 'utf8');
        
        // Pad to ensure minimum size
        const minSize = 1500;
        if (buffer.length < minSize) {
            const padding = Buffer.alloc(minSize - buffer.length, ' ');
            return Buffer.concat([buffer, padding]);
        }
        
        return buffer;
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.events) {
            this.events = {};
        }
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return this;
    }

    emit(event, ...args) {
        if (this.events && this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
        }
        return this;
    }
}

export default MockPDFDocument;