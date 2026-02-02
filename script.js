// ==========================================
// PROJECT AIGIS: Steganography Engine
// Coded by: Aryiion | Version: Anti-Shield Protocol
// ==========================================

const STOPPER = "||END||"; 
let currentImage = null;   
let mode = 'encrypt';       

const elements = {
    imageInput: document.getElementById('imageInput'),
    preview: document.getElementById('preview'),
    messageBox: document.getElementById('messageBox'),
    passKey: document.getElementById('passKey'),
    actionBtn: document.getElementById('actionBtn'),
    statusLog: document.getElementById('statusLog'),
    canvas: document.getElementById('stegoCanvas'),
    outputArea: document.getElementById('outputArea'),
    downloadLink: document.getElementById('downloadLink'),
    btnEncrypt: document.getElementById('btnModeEncrypt'),
    btnDecrypt: document.getElementById('btnModeDecrypt')
};

// [PENTING] alpha: false memaksa background transparan jadi HITAM SOLID
// Ini mencegah browser menghapus data di area transparan.
const ctx = elements.canvas.getContext('2d', { willReadFrequently: true, alpha: false });

// --- EVENT LISTENERS ---

elements.imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImage = new Image();
            currentImage.src = event.target.result;
            currentImage.onload = () => {
                elements.preview.src = event.target.result;
                logStatus(`>> Image Loaded (${currentImage.width}x${currentImage.height}px). System Ready.`, "#00ff41");
                elements.outputArea.classList.add('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
});

elements.btnEncrypt.addEventListener('click', () => switchMode('encrypt'));
elements.btnDecrypt.addEventListener('click', () => switchMode('decrypt'));

elements.actionBtn.addEventListener('click', () => {
    if (!currentImage) return alert("ERROR: Upload gambar dulu!");
    if (elements.passKey.value === "") return alert("ERROR: Masukkan password!");

    logStatus(">> Processing...", "#fff");
    
    setTimeout(() => {
        if (mode === 'encrypt') processEncryption();
        else processDecryption();
    }, 100);
});

// --- HELPER FUNCTIONS ---

function switchMode(newMode) {
    mode = newMode;
    if (mode === 'encrypt') {
        elements.actionBtn.innerText = "INITIATE ENCODING";
        elements.messageBox.disabled = false;
        elements.messageBox.placeholder = "Enter secret payload here...";
        elements.btnEncrypt.style.background = '#00ff41';
        elements.btnDecrypt.style.background = '#111';
        elements.btnEncrypt.classList.add('active');
        elements.btnDecrypt.classList.remove('active');
    } else {
        elements.actionBtn.innerText = "INITIATE DECODING";
        elements.messageBox.disabled = true;
        elements.messageBox.placeholder = "Message will appear here...";
        elements.messageBox.value = "";
        elements.btnDecrypt.style.background = '#00e5ff';
        elements.btnEncrypt.style.background = '#111';
        elements.btnDecrypt.classList.add('active');
        elements.btnEncrypt.classList.remove('active');
    }
}

function logStatus(text, color) {
    elements.statusLog.innerText = text;
    elements.statusLog.style.color = color;
}

// ==========================================
// CORE LOGIC: ENCRYPTION
// ==========================================
function processEncryption() {
    const text = elements.messageBox.value;
    if (!text) return alert("Isi pesan dulu!");

    try {
        const encrypted = CryptoJS.AES.encrypt(text, elements.passKey.value).toString();
        const payload = encrypted + STOPPER;

        logStatus(">> Encrypting & Injecting Bits...", "#ffff00");

        let binary = "";
        for (let i = 0; i < payload.length; i++) {
            binary += payload.charCodeAt(i).toString(2).padStart(8, '0');
        }

        elements.canvas.width = currentImage.width;
        elements.canvas.height = currentImage.height;
        
        // [SAFETY] Gambar background hitam dulu
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
        ctx.drawImage(currentImage, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        const data = imgData.data;

        if (binary.length > data.length / 4 * 3) {
            return alert("Gambar terlalu kecil! Cari resolusi lebih besar.");
        }

        let binIdx = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (binIdx >= binary.length) break;
            for (let j = 0; j < 3; j++) {
                if (binIdx < binary.length) {
                    data[i + j] = (data[i + j] & 254) | parseInt(binary[binIdx]);
                    binIdx++;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultURL = elements.canvas.toDataURL('image/png');
        
        elements.downloadLink.href = resultURL;
        elements.outputArea.classList.remove('hidden');
        elements.preview.src = resultURL;
        
        logStatus(">> SUCCESS! Data encrypted & hidden.", "#00ff41");
        
    } catch (e) {
        console.error(e);
        logStatus("ERROR during encryption.", "red");
    }
}

// ==========================================
// CORE LOGIC: DECRYPTION
// ==========================================
function processDecryption() {
    logStatus(">> Scanning LSB layers...", "#00e5ff");

    elements.canvas.width = currentImage.width;
    elements.canvas.height = currentImage.height;
    ctx.drawImage(currentImage, 0, 0);
    
    const data = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height).data;

    let binaryString = "";
    let finalString = "";
    let found = false;

    // Scan Pixel
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            binaryString += (data[i + j] & 1).toString();

            if (binaryString.length === 8) {
                const charCode = parseInt(binaryString, 2);
                finalString += String.fromCharCode(charCode);
                binaryString = ""; 

                if (finalString.includes(STOPPER)) {
                    finishDecryption(finalString);
                    found = true;
                    return; 
                }
            }
        }
    }
    
    if (!found) {
        // Analisa apakah ini karena Brave Shield?
        console.warn("DEBUG: Tidak menemukan STOPPER sama sekali.");
        console.warn("DEBUG: 50 Karakter pertama yg terbaca: ", finalString.substring(0, 50));
        
        logStatus(">> GAGAL: Data tidak ditemukan. Cek Console (F12).", "red");
        alert("DATA TIDAK DITEMUKAN!\n\nKemungkinan Penyebab:\n1. Brave Shield NYALA (Matikan ikon Singa di atas!)\n2. Gambar bukan PNG murni (Kena kompresi WA/JPG)\n3. Gambar belum di-encode.");
    }
}

function finishDecryption(rawString) {
    const encryptedData = rawString.replace(STOPPER, "");
    
    // [DEBUGGING] Tampilkan data mentah di Console
    console.log("=== DATA DITEMUKAN ===");
    console.log("Ciphertext:", encryptedData);

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, elements.passKey.value);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);

        if (originalText) {
            elements.messageBox.value = originalText;
            logStatus(">> DECRYPTION SUCCESSFUL.", "#00ff41");
        } else {
            throw new Error("Result Kosong");
        }
    } catch (e) {
        elements.messageBox.value = "CIPHERTEXT: " + encryptedData;
        logStatus(">> GAGAL DEKRIPSI (Invalid Key / Data Corrupt)", "red");
        alert("DEKRIPSI GAGAL!\n\nSistem menemukan data, tapi password salah ATAU data rusak oleh Browser.\n\nTips:\n- Pastikan Password benar (Huruf besar/kecil)\n- MATIKAN BRAVE SHIELD (Ikon Singa)\n- Gunakan Chrome/Firefox biasa.");
    }
}