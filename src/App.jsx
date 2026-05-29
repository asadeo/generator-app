import { useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

// ===== BUILT-IN TEMPLATE DEFINITIONS =====
const BUILTIN_TEMPLATES = [
  {
    id: 'sertifikat_pelatihan',
    name: 'Sertifikat Pelatihan',
    type: 'sertifikat',
    thumbnail: null,
    description: 'Sertifikat resmi kegiatan pelatihan/workshop',
    fields: [
      { key: 'nama', label: 'Nama Peserta', x: 50, y: 52, size: 34, color: '#1e3a5f', align: 'center' },
      { key: 'jabatan', label: 'Jabatan/Instansi', x: 50, y: 60, size: 14, color: '#4a4a4a', align: 'center' },
      { key: 'kegiatan', label: 'Nama Kegiatan', x: 50, y: 70, size: 13, color: '#2d2d2d', align: 'center' },
      { key: 'tanggal', label: 'Tanggal Pelaksanaan', x: 50, y: 78, size: 12, color: '#555555', align: 'center' },
    ],
    renderCanvas: (ctx, w, h) => {
      // Navy border
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 12, w - 24, h - 24);
      ctx.fillStyle = '#f8f4e8';
      ctx.fillRect(20, 20, w - 40, h - 40);
      // Gold accent lines
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 3;
      ctx.strokeRect(28, 28, w - 56, h - 56);
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 32, w - 64, h - 64);
      // Header
      ctx.fillStyle = '#1e3a5f';
      ctx.font = 'bold 22px serif';
      ctx.textAlign = 'center';
      ctx.fillText('SERTIFIKAT', w / 2, 80);
      ctx.font = '13px serif';
      ctx.fillStyle = '#c8a84b';
      ctx.fillText('CERTIFICATE OF COMPLETION', w / 2, 98);
      ctx.fillStyle = '#1e3a5f';
      ctx.font = '11px sans-serif';
      ctx.fillText('Diberikan Kepada:', w / 2, 125);
      // Name placeholder
      ctx.font = 'italic bold 28px serif';
      ctx.fillStyle = '#1e3a5f';
      ctx.fillText('[NAMA PESERTA]', w / 2, 165);
      // Gold underline
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w/2 - 140, 172); ctx.lineTo(w/2 + 140, 172); ctx.stroke();
      // Subtitle placeholders
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#555';
      ctx.fillText('[Jabatan / Instansi]', w / 2, 188);
      ctx.fillText('atas partisipasinya dalam kegiatan:', w / 2, 205);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#1e3a5f';
      ctx.fillText('[NAMA KEGIATAN]', w / 2, 222);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#777';
      ctx.fillText('[Tanggal Pelaksanaan]', w / 2, 238);
      // Footer
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#1e3a5f';
      ctx.fillText('DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. PATI', w / 2, h - 50);
      // Signature line
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w/2 + 40, h - 35); ctx.lineTo(w/2 + 180, h - 35); ctx.stroke();
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#555';
      ctx.fillText('Kepala Dinas', w/2 + 110, h - 28);
    }
  },
  {
    id: 'sertifikat_penghargaan',
    name: 'Sertifikat Penghargaan',
    type: 'sertifikat',
    thumbnail: null,
    description: 'Sertifikat penghargaan prestasi atau kontribusi',
    fields: [
      { key: 'nama', label: 'Nama Penerima', x: 50, y: 50, size: 32, color: '#7b2d00', align: 'center' },
      { key: 'atas_nama', label: 'Atas Nama / Prestasi', x: 50, y: 62, size: 13, color: '#333333', align: 'center' },
      { key: 'nomor', label: 'Nomor Sertifikat', x: 50, y: 86, size: 10, color: '#888888', align: 'center' },
    ],
    renderCanvas: (ctx, w, h) => {
      // Gold-maroon
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#fdf6e3');
      grad.addColorStop(1, '#fef9ec');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#9b2335';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      // Decorative corners
      const corners = [[24, 24], [w-24, 24], [24, h-24], [w-24, h-24]];
      corners.forEach(([cx, cy]) => {
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Star/emblem
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', w / 2, 70);
      ctx.font = 'bold 20px serif';
      ctx.fillStyle = '#9b2335';
      ctx.fillText('SERTIFIKAT PENGHARGAAN', w / 2, 95);
      ctx.font = '11px serif';
      ctx.fillStyle = '#c8a84b';
      ctx.fillText('AWARD OF EXCELLENCE', w / 2, 110);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#555';
      ctx.fillText('Dengan bangga diberikan kepada:', w / 2, 132);
      ctx.font = 'italic bold 26px serif';
      ctx.fillStyle = '#7b2d00';
      ctx.fillText('[NAMA PENERIMA]', w / 2, 160);
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(w/2 - 120, 168); ctx.lineTo(w/2 + 120, 168); ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#555';
      ctx.fillText('[Atas Nama / Prestasi]', w / 2, 188);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('No: [Nomor Sertifikat]', w / 2, h - 50);
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#9b2335';
      ctx.fillText('DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. PATI', w / 2, h - 38);
    }
  },
  {
    id: 'id_card_panitia',
    name: 'ID Card Panitia',
    type: 'id_card',
    thumbnail: null,
    description: 'Tanda pengenal panitia kegiatan',
    fields: [
      { key: 'nama', label: 'Nama', x: 50, y: 60, size: 16, color: '#ffffff', align: 'center' },
      { key: 'jabatan_panitia', label: 'Jabatan Panitia', x: 50, y: 70, size: 11, color: '#e0e0ff', align: 'center' },
      { key: 'no_id', label: 'Nomor ID', x: 50, y: 88, size: 10, color: '#cccccc', align: 'center' },
    ],
    renderCanvas: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a237e');
      grad.addColorStop(1, '#283593');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c8a84b';
      ctx.fillRect(0, 0, w, 36);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#1a237e';
      ctx.textAlign = 'center';
      ctx.fillText('PANITIA', w / 2, 22);
      ctx.font = '8px sans-serif';
      ctx.fillText('DISDIKBUD KAB. PATI', w / 2, 32);
      ctx.beginPath();
      ctx.arc(w / 2, 70, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '28px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('👤', w / 2, 84);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[NAMA]', w / 2, 116);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#b0b8e0';
      ctx.fillText('[Jabatan Panitia]', w / 2, 130);
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('ID: [No ID]', w / 2, h - 16);
    }
  },
];

// ===== RENDER BUILTIN TEMPLATE TO DATAURL =====
function renderBuiltinToDataURL(tmpl, docConfig) {
  const cfg = docConfig[tmpl.type];
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = cfg.width * scale;
  canvas.height = cfg.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  tmpl.renderCanvas(ctx, cfg.width, cfg.height);
  return canvas.toDataURL('image/png');
}

export default function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [currentModule, setCurrentModule] = useState('generator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [documentType, setDocumentType] = useState('sertifikat');
  const [template, setTemplate] = useState(null);
  const [templateSource, setTemplateSource] = useState(null); // 'builtin' | 'upload'
  const [selectedBuiltin, setSelectedBuiltin] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableQR, setEnableQR] = useState(true);
  const imageRef = useRef(null);

  // AI template analysis state
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [detectedFields, setDetectedFields] = useState([]);
  const [analysisMode, setAnalysisMode] = useState(null); // 'ai' | 'manual'
  const [manualFieldEntry, setManualFieldEntry] = useState([{ key: '', label: '' }]);

  // Bulk manual input state (new feature)
  const [bulkInputMode, setBulkInputMode] = useState('csv'); // 'csv' | 'manual_multi'
  const [multiRowInputs, setMultiRowInputs] = useState([{}]);

  // OCR STATE
  const [ocrImage, setOcrImage] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  // const [manualInput, setManualInput] = useState('');

  // PDF UTILITY STATE
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  const docConfig = {
    sertifikat: { orientation: 'landscape', format: 'a4', width: 297, height: 210 },
    id_card: { orientation: 'portrait', format: [90, 130], width: 90, height: 130 },
    surat: { orientation: 'portrait', format: 'a4', width: 210, height: 297 }
  };

  // ===== BUILT-IN TEMPLATE SELECTION =====
  const handleSelectBuiltinTemplate = (tmpl) => {
    setSelectedBuiltin(tmpl);
    setDocumentType(tmpl.type);
    const dataUrl = renderBuiltinToDataURL(tmpl, docConfig);
    setTemplate(dataUrl);
    setTemplateSource('builtin');

    // Auto-set fields from built-in template definition
    const initialConfigs = {};
    tmpl.fields.forEach(f => {
      initialConfigs[f.key] = {
        x: f.x, y: f.y, size: f.size, color: f.color, align: f.align || 'center'
      };
    });
    setHeaders(tmpl.fields.map(f => f.key));
    setFieldConfigs(initialConfigs);
    setActiveField(tmpl.fields[0]?.key || null);
    setDetectedFields(tmpl.fields);
    setAnalysisMode('builtin');
  };

  // ===== UPLOAD CUSTOM TEMPLATE =====
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTemplate(event.target.result);
      setTemplateSource('upload');
      setSelectedBuiltin(null);
      setDetectedFields([]);
      setHeaders([]);
      setFieldConfigs({});
      setActiveField(null);
      setAnalysisMode(null);
    };
    reader.readAsDataURL(file);
  };

  // ===== AI TEMPLATE ANALYSIS via Anthropic API =====
  const analyzeTemplateWithAI = async () => {
    if (!template) return;
    setIsAnalyzingTemplate(true);
    setAnalysisMode('ai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key Gemini tidak ditemukan di file .env");
      setIsAnalyzingTemplate(false);
      return;
    }
    try {
      const base64 = template.includes(',') ? template.split(',')[1] : template;
      const isJpeg = template.startsWith('data:image/jpeg') || template.startsWith('data:image/jpg');
      const mediaType = isJpeg ? 'image/jpeg' : 'image/png';

      const prompt = `Analisis gambar template sertifikat/dokumen ini. Identifikasi semua bagian teks yang bisa diisi/diubah per peserta (misal: nama, jabatan, instansi, tanggal, nomor sertifikat, judul kegiatan, dll).
 
Kembalikan HANYA JSON valid tanpa teks lain, format:
{
  "fields": [
    {"key": "nama", "label": "Nama Peserta", "x": 50, "y": 52, "size": 28, "color": "#000000"},
    {"key": "jabatan", "label": "Jabatan", "x": 50, "y": 62, "size": 14, "color": "#333333"}
  ],
  "document_type": "sertifikat"
}
 
Rules:
- key: huruf kecil, underscore, tanpa spasi
- x,y: persentase posisi 0-100 (estimasi berdasarkan visual)
- size: ukuran font pt (8-60)
- color: hex color sesuai warna teks di template
- document_type: "sertifikat", "id_card", atau "surat"
- Deteksi minimal 2, maksimal 8 field yang paling penting`;
 
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: base64
                }
              },
              {
                text: prompt
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.map(c => c.text || '').join('') || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed.fields && Array.isArray(parsed.fields)) {
        const configs = {};
        parsed.fields.forEach((f, i) => {
          configs[f.key] = {
            x: f.x ?? 50,
            y: f.y ?? (40 + i * 12),
            size: f.size ?? 14,
            color: f.color ?? '#000000',
            align: 'center'
          };
        });
        setDetectedFields(parsed.fields);
        setHeaders(parsed.fields.map(f => f.key));
        setFieldConfigs(configs);
        setActiveField(parsed.fields[0]?.key || null);
        if (parsed.document_type && docConfig[parsed.document_type]) {
          setDocumentType(parsed.document_type);
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      alert('Gagal menganalisis template. Silakan gunakan opsi input manual.');
      setAnalysisMode('manual');
    }
    setIsAnalyzingTemplate(false);
  };

  // ===== MANUAL FIELD SETUP =====
  const applyManualFields = () => {
    const validFields = manualFieldEntry.filter(f => f.key.trim() && f.label.trim());
    if (validFields.length === 0) {
      alert('Masukkan minimal 1 field dengan key dan label.');
      return;
    }
    const configs = {};
    validFields.forEach((f, i) => {
      configs[f.key.trim().toLowerCase().replace(/\s+/g, '_')] = {
        x: 50, y: 40 + i * 12,
        size: f.key.toLowerCase().includes('nama') ? 28 : 13,
        color: '#000000',
        align: 'center'
      };
    });
    const normalizedFields = validFields.map(f => ({
      ...f,
      key: f.key.trim().toLowerCase().replace(/\s+/g, '_')
    }));
    setDetectedFields(normalizedFields);
    setHeaders(normalizedFields.map(f => f.key));
    setFieldConfigs(configs);
    setActiveField(normalizedFields[0]?.key || null);
    setAnalysisMode('manual_done');
  };

  // ===== CSV / DATA PROCESSING =====
  const processCSVData = (csvString) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const detectedHeaders = results.meta.fields;
        // Merge with existing fieldConfigs if fields already set
        const initialConfigs = { ...fieldConfigs };
        detectedHeaders.forEach((header, index) => {
          if (!initialConfigs[header]) {
            let defaultSize = 12;
            if (header === 'nama' || header === 'nama_peserta') {
              defaultSize = documentType === 'sertifikat' ? 32 : 18;
            }
            initialConfigs[header] = {
              x: 50, y: 40 + index * 10,
              size: defaultSize,
              color: '#000000',
              align: 'center'
            };
          }
        });
        setHeaders(detectedHeaders);
        setFieldConfigs(initialConfigs);
        setActiveField(detectedHeaders[0]);
        setParticipants(results.data);
      }
    });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => processCSVData(event.target.result);
    reader.readAsText(file);
    e.target.value = null;
  };

  // ===== MULTI-ROW MANUAL INPUT =====
  const updateMultiRow = (rowIndex, key, value) => {
    setMultiRowInputs(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
  };

  const addMultiRow = () => {
    setMultiRowInputs(prev => [...prev, {}]);
  };

  const removeMultiRow = (idx) => {
    setMultiRowInputs(prev => prev.filter((_, i) => i !== idx));
  };

  const applyMultiRowData = () => {
    const valid = multiRowInputs.filter(row => headers.some(h => row[h]?.trim()));
    if (valid.length === 0) {
      alert('Isi minimal 1 baris data.');
      return;
    }
    setParticipants(prev => [...prev, ...valid]);
    setMultiRowInputs([{}]);
  };

  // ===== OCR =====
  const handleOCRImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrImage(URL.createObjectURL(file));
    setIsExtracting(true);
    setRawText('Sedang memindai gambar... Mohon tunggu.');
    try {
      const result = await Tesseract.recognize(file, 'ind', { logger: m => console.log(m) });
      setRawText(result.data.text);
    } catch (error) {
      console.error(error);
      setRawText('Gagal memindai teks. Pastikan gambar jelas.');
    }
    setIsExtracting(false);
    e.target.value = null;
  };

  const handleAICleansing = async () => {
    if (!rawText) return;
    setIsCleaning(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key Gemini tidak ditemukan di file .env");
      setIsCleaning(false);
      return;
    }
    const prompt = `Ekstrak nama dari teks OCR ini. Rapikan kapital & gelar. Kembalikan HANYA format tabel CSV dengan 1 kolom header "nama".\n\nTeks:\n${rawText}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      let csv = data.content?.map(c => c.text || '').join('') || '';
      csv = csv.replace(/```csv\n?/g, '').replace(/```\n?/g, '').trim();
      processCSVData(csv);
      setRawText('Data berhasil dirapikan dan dimasukkan ke sistem!');
    } catch (error) {
      console.error(error);
      alert('Gagal menghubungi AI. Periksa koneksi internet.');
    }
    setIsCleaning(false);
  };

  // const handleAddManualParticipant = () => {
  //   if (!manualInput.trim()) return;
  //   if (headers.length === 0 || !headers.includes('nama')) {
  //     const newHeaders = [...headers.filter(h => h !== 'nama'), 'nama'];
  //     setHeaders(newHeaders);
  //     setFieldConfigs(prev => ({
  //       ...prev,
  //       nama: { x: 50, y: 50, size: documentType === 'sertifikat' ? 32 : 18, color: '#000000', align: 'center' }
  //     }));
  //     if (!activeField) setActiveField('nama');
  //   }
  //   setParticipants(prev => [...prev, { nama: manualInput.trim() }]);
  //   setManualInput('');
  // };

  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh antrean data?')) {
      setParticipants([]);
    }
  };

  const handleImageClick = (e) => {
    if (!imageRef.current || !activeField) return;
    const rect = imageRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setFieldConfigs(prev => ({ ...prev, [activeField]: { ...prev[activeField], x: xPercent, y: yPercent } }));
  };

  const updateConfig = (field, key, value) => {
    setFieldConfigs(prev => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
  };

  // ===== PDF UTILITY =====
  const handlePdfUpload = (e) => setPdfFiles([...e.target.files]);

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) { alert('Pilih minimal 2 file PDF.'); return; }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const mergedPdfFile = await mergedPdf.save();
      saveAs(new Blob([mergedPdfFile], { type: 'application/pdf' }), `Gabungan_Dokumen_SITU_${Date.now()}.pdf`);
      setPdfFiles([]);
    } catch (error) {
      console.error(error)
      alert('Gagal menggabungkan PDF. Pastikan file tidak terkunci sandi.');
    }
    setIsMerging(false);
  };

  // ===== GENERATE CERTIFICATES =====
  const generateCertificates = async () => {
    if (!template || participants.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();
    const config = docConfig[documentType];

    for (let i = 0; i < participants.length; i++) {
      const rowData = participants[i];
      const doc = new jsPDF({ orientation: config.orientation, unit: 'mm', format: config.format });
      doc.addImage(template, 'PNG', 0, 0, config.width, config.height);
      doc.setFont('helvetica', 'bold');

      headers.forEach(field => {
        const textToPrint = rowData[field] || '';
        const fConfig = fieldConfigs[field];
        if (!fConfig) return;
        doc.setFontSize(Number(fConfig.size));
        doc.setTextColor(fConfig.color);
        const align = fConfig.align || (documentType === 'surat' ? 'left' : 'center');
        doc.text(textToPrint, (fConfig.x / 100) * config.width, (fConfig.y / 100) * config.height, { align });
      });

      if (enableQR) {
        try {
          const participantName = rowData['nama'] || rowData['nama_peserta'] || `Peserta_${i + 1}`;
          const qrDataText = `DOKUMEN VALID DISDIKBUD PATI\nNama: ${participantName}\nJenis: ${documentType.toUpperCase()}\nTanggal: ${new Date().toLocaleDateString('id-ID')}`;
          const qrDataUrl = await QRCode.toDataURL(qrDataText, { margin: 1, width: 150 });
          if (documentType === 'sertifikat') doc.addImage(qrDataUrl, 'PNG', 265, 175, 22, 22);
          else if (documentType === 'surat') doc.addImage(qrDataUrl, 'PNG', 175, 265, 22, 22);
          else doc.addImage(qrDataUrl, 'PNG', 65, 105, 18, 18);
        } catch (qrErr) { console.error(qrErr); }
      }

      const fileNameStr = rowData['nama'] || rowData['nama_peserta'] || `Dokumen_${i + 1}`;
      const prefix = documentType === 'sertifikat' ? 'Sertifikat' : documentType === 'surat' ? 'Surat' : 'ID_Card';
      zip.file(`${prefix}_${fileNameStr}.pdf`, doc.output('blob'));
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const zipName = documentType === 'sertifikat' ? 'Sertifikat' : documentType === 'surat' ? 'Surat_Massal' : 'ID_Card';
    saveAs(zipContent, `Arsip_${zipName}_Disdikbud.zip`);

    // Generate recap report
    try {
      const reportDoc = new jsPDF();
      reportDoc.setFont('helvetica', 'bold');
      reportDoc.setFontSize(14);
      reportDoc.text('LAPORAN REKAPITULASI PENCETAKAN DOKUMEN', 105, 20, { align: 'center' });
      reportDoc.setFontSize(11);
      reportDoc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. PATI', 105, 26, { align: 'center' });
      reportDoc.setLineWidth(0.5);
      reportDoc.line(14, 30, 196, 30);
      reportDoc.setFont('helvetica', 'normal');
      reportDoc.text(`Tanggal Cetak   : ${new Date().toLocaleDateString('id-ID')}`, 14, 40);
      reportDoc.text(`Jenis Dokumen   : ${documentType.toUpperCase()}`, 14, 46);
      reportDoc.text(`Total Dicetak   : ${participants.length} Berkas`, 14, 52);
      const tableColumn = ['No', 'Nama Peserta Tercetak'];
      const tableRows = participants.map((p, idx) => [
        idx + 1,
        p.nama || p.nama_peserta || p.Nama || p[headers[0]] || 'Nama tidak ditemukan'
      ]);
      autoTable(reportDoc, {
        startY: 60, head: [tableColumn], body: tableRows, theme: 'grid',
        headStyles: { fillColor: [49, 46, 129] },
        styles: { font: 'helvetica', fontSize: 10 }
      });
      const finalY = reportDoc.lastAutoTable.finalY || 60;
      reportDoc.text(`Pati, ${new Date().toLocaleDateString('id-ID')}`, 140, finalY + 20);
      reportDoc.text('Mengetahui,', 140, finalY + 26);
      reportDoc.text('Staf Tata Usaha', 140, finalY + 32);
      reportDoc.text('_______________________', 140, finalY + 55);
      reportDoc.text('NIP.', 140, finalY + 61);
      reportDoc.save(`Berita_Acara_Cetak_${documentType}.pdf`);
    } catch (err) { console.error(err); }

    setIsProcessing(false);
  };

  // ===== STEP COMPLETENESS CHECKS =====
  const step1Done = !!template;
  const step2Done = headers.length > 0;
  const step3Done = participants.length > 0;

  const StepBadge = ({ n, done, active }) => (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? 'bg-indigo-600 border-indigo-600 text-white' : active ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-slate-300 text-slate-400 bg-white'}`}>
      {done ? '✓' : n}
    </div>
  );

  // Mini canvas preview for built-in templates
function BuiltinPreview({ tmpl, docConfig }) {
  const canvasRef = useRef(null);
  const cfg = docConfig[tmpl.type];
  const scale = tmpl.type === 'id_card' ? 1.2 : 0.6;
  const w = cfg.width * scale;
  const h = cfg.height * scale;

  useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    tmpl.renderCanvas(ctx, cfg.width, cfg.height);
    ctx.restore();
  }, [tmpl])();

  return (
    <canvas
      ref={el => {
        if (!el) return;
        const ctx = el.getContext('2d');
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.save();
        ctx.scale(scale, scale);
        tmpl.renderCanvas(ctx, cfg.width, cfg.height);
        ctx.restore();
      }}
      width={Math.round(w)}
      height={Math.round(h)}
      className="w-full rounded-lg border border-slate-200 shadow-sm"
      style={{ maxHeight: '120px', objectFit: 'contain' }}
    />
  );
}

  // ===== RENDER =====
  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-72 md:w-64 bg-indigo-900 text-white flex flex-col shadow-2xl z-30 transition-transform duration-300 justify-between`}>
        <div>
          <div className="p-6 border-b border-indigo-800 flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner bg-white overflow-hidden shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span class="text-indigo-700 font-bold text-lg">D</span>'; }} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">APP Generator</h1>
                <p className="text-xs text-indigo-300">Disdikbud Kab. Pati</p>
              </div>
            </div>
            <button className="md:hidden text-indigo-300 hover:text-white p-2 text-xl" onClick={() => setIsSidebarOpen(false)}>✕</button>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => { setCurrentModule('generator'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${currentModule === 'generator' ? 'bg-indigo-800 shadow-sm border border-indigo-700' : 'hover:bg-indigo-800/50 text-indigo-200'}`}>
              <span>📄</span> Generator Dokumen
            </button>
            <button onClick={() => { setCurrentModule('pdf_utility'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${currentModule === 'pdf_utility' ? 'bg-indigo-800 shadow-sm border border-indigo-700' : 'hover:bg-indigo-800/50 text-indigo-200'}`}>
              <span>🗂️</span> Utilitas PDF
            </button>
          </nav>
        </div>
        <div className="p-4 m-4 rounded-xl bg-indigo-950/60 border border-indigo-800 text-center">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Dikembangkan Oleh</p>
          <p className="text-xs font-semibold text-indigo-100">Mahasiswa Teknik Informatika UNNES</p>
          <div className="h-px bg-indigo-800 my-2"></div>
          <p className="text-[10px] text-indigo-300"></p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white px-4 md:px-8 py-4 flex items-center gap-4 shadow-sm z-10">
          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xl" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <div>
            <h2 className="text-xl font-bold text-slate-700">Portal App Generator</h2>
            <p className="text-xs text-slate-400 font-medium">Sistem Pemrosesan Dokumen & Ekstraksi AI Terintegrasi</p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">

          {/* ===== PDF UTILITY ===== */}
          {currentModule === 'pdf_utility' && (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">🔗</div>
                <div>
                  <h3 className="text-xl font-bold">Penggabung File PDF (Merger)</h3>
                  <p className="text-sm text-slate-500">Gabungkan lembar arsip hasil scan (SK/Ijazah/Surat) menjadi satu berkas secara lokal.</p>
                </div>
              </div>
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center mb-6">
                <span className="text-4xl mb-3 block">📄</span>
                <p className="text-sm font-semibold text-slate-700 mb-2">Pilih beberapa berkas PDF yang ingin disatukan</p>
                <input type="file" multiple accept=".pdf" onChange={handlePdfUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full" />
              </div>
              {pdfFiles.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Urutan Gabungan Berkas ({pdfFiles.length}):</p>
                  <ul className="space-y-2">
                    {Array.from(pdfFiles).map((file, i) => (
                      <li key={i} className="text-sm bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
                        <span className="font-bold text-slate-400">{i + 1}.</span>
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={mergePdfs} disabled={isMerging || pdfFiles.length < 2} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isMerging || pdfFiles.length < 2 ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {isMerging ? '🔄 Menyatukan Lembar Halaman Berkas...' : 'Gabungkan PDF Sekarang'}
              </button>
            </div>
          )}

          {/* ===== GENERATOR ===== */}
          {currentModule === 'generator' && (
            <>
              {/* Step Tabs */}
              <div className="flex items-center gap-0 mb-6 overflow-x-auto">
                {[
                  { n: 1, label: 'Template', done: step1Done && step2Done },
                  { n: 2, label: 'Input Data', done: step3Done },
                  { n: 3, label: 'Tata Letak & Cetak', done: false },
                ].map((step, idx, arr) => (
                  <div key={step.n} className="flex items-center shrink-0">
                    <button
                      onClick={() => setActiveTab(step.n)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === step.n ? 'bg-white shadow-sm text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <StepBadge n={step.n} done={step.done} active={activeTab === step.n} />
                      {step.label}
                    </button>
                    {idx < arr.length - 1 && <div className="w-6 h-px bg-slate-300 mx-1" />}
                  </div>
                ))}
              </div>

              <div className="max-w-5xl bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">

                {/* ===== TAB 1: TEMPLATE ===== */}
                {activeTab === 1 && (
                  <div>
                    <h3 className="text-lg font-bold mb-1">Pilih atau Upload Template</h3>
                    <p className="text-sm text-slate-500 mb-6">Gunakan template bawaan sistem, atau upload desain Anda sendiri (gambar/foto template).</p>

                    {/* Tipe dokumen */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Tipe Keluaran Administrasi:</label>
                      <div className="flex flex-col md:flex-row gap-3">
                        <button onClick={() => setDocumentType('sertifikat')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'sertifikat' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>🎓 Sertifikat (A4 Lanskap)</button>
                        <button onClick={() => setDocumentType('id_card')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'id_card' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>🪪 ID Card (Potret)</button>
                        {/* <button onClick={() => setDocumentType('surat')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'surat' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>📄 Surat (A4 Potret)</button> */}
                      </div>
                    </div>

                    {/* Built-in templates */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">A</span>
                        <h4 className="font-bold text-slate-700">Template Bawaan Sistem</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BUILTIN_TEMPLATES.filter(t => t.type === documentType || documentType === 'surat').map(tmpl => (
                          <button
                            key={tmpl.id}
                            onClick={() => handleSelectBuiltinTemplate(tmpl)}
                            className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${selectedBuiltin?.id === tmpl.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                          >
                            {/* Canvas preview */}
                            <BuiltinPreview tmpl={tmpl} docConfig={docConfig} />
                            <p className="font-bold text-sm text-slate-800 mt-2">{tmpl.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>
                            {selectedBuiltin?.id === tmpl.id && (
                              <div className="mt-2 flex items-center gap-1 text-indigo-600 text-xs font-bold">
                                <span>✓</span> Dipilih
                              </div>
                            )}
                          </button>
                        ))}
                        {BUILTIN_TEMPLATES.filter(t => t.type === documentType).length === 0 && (
                          <div className="col-span-full p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-2xl mb-2">📋</p>
                            <p className="text-sm">Belum ada template bawaan untuk tipe ini. Gunakan opsi upload di bawah.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload custom */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">B</span>
                        <h4 className="font-bold text-slate-700">Upload Template Sendiri</h4>
                      </div>
                      <div className="p-5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border border-slate-300 rounded-lg bg-white cursor-pointer text-sm" />
                        {templateSource === 'upload' && template && (
                          <div className="mt-4">
                            <img src={template} alt="Preview template" className="max-h-40 rounded-lg border border-slate-200 shadow-sm mx-auto block" />
                            <p className="text-xs text-emerald-700 font-semibold text-center mt-2">✓ Template berhasil diunggah</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field Analysis (only for uploaded templates) */}
                    {templateSource === 'upload' && template && (
                      <div className="mb-6 p-5 rounded-xl border border-amber-200 bg-amber-50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🔍</span>
                          <h4 className="font-bold text-amber-900">Analisis Field Template</h4>
                          <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">✨ AI Ready</span>
                        </div>
                        <p className="text-xs text-amber-700 mb-4">Sistem perlu mengetahui bagian mana dari template yang bisa diisi per peserta. Pilih metode analisis:</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {/* AI Analyze */}
                          <button
                            onClick={analyzeTemplateWithAI}
                            disabled={isAnalyzingTemplate}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analysisMode === 'ai' || analysisMode === 'builtin' ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-white hover:border-amber-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">🤖</span>
                              <span className="font-bold text-sm text-amber-900">Analisis Otomatis AI</span>
                            </div>
                            <p className="text-xs text-amber-700">AI membaca gambar template dan mendeteksi field secara otomatis</p>
                            {isAnalyzingTemplate && <p className="text-xs text-amber-600 mt-2 font-semibold animate-pulse">Menganalisis template...</p>}
                            {analysisMode === 'ai' && detectedFields.length > 0 && (
                              <p className="text-xs text-emerald-700 mt-2 font-bold">✓ {detectedFields.length} field terdeteksi</p>
                            )}
                          </button>

                          {/* Manual */}
                          <button
                            onClick={() => setAnalysisMode('manual')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analysisMode === 'manual' ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-white hover:border-amber-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">✍️</span>
                              <span className="font-bold text-sm text-amber-900">Input Manual Kolom</span>
                            </div>
                            <p className="text-xs text-amber-700">Tentukan sendiri nama-nama Kolom yang ada di template</p>
                          </button>
                        </div>

                        {/* Manual field entry */}
                        {analysisMode === 'manual' && (
                          <div className="p-4 bg-white rounded-xl border border-amber-200 mt-2">
                            <p className="text-xs font-bold text-slate-600 mb-3">Definisikan Field (misal: nama, jabatan, tanggal)</p>
                            <div className="space-y-2 mb-3">
                              {manualFieldEntry.map((f, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <input
                                    type="text" placeholder="key (cth: nama)"
                                    value={f.key}
                                    onChange={e => setManualFieldEntry(prev => { const n=[...prev]; n[idx]={...n[idx],key:e.target.value}; return n; })}
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                                  />
                                  <input
                                    type="text" placeholder="label (cth: Nama Peserta)"
                                    value={f.label}
                                    onChange={e => setManualFieldEntry(prev => { const n=[...prev]; n[idx]={...n[idx],label:e.target.value}; return n; })}
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                                  />
                                  {manualFieldEntry.length > 1 && (
                                    <button onClick={() => setManualFieldEntry(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 px-2">✕</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setManualFieldEntry(prev => [...prev, { key: '', label: '' }])} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200">+ Tambah Field</button>
                              <button onClick={applyManualFields} className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700">Terapkan Field</button>
                            </div>
                          </div>
                        )}

                        {/* Show detected fields */}
                        {(analysisMode === 'ai' || analysisMode === 'manual_done') && detectedFields.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200">
                            <p className="text-xs font-bold text-emerald-700 mb-2">Field yang akan digunakan:</p>
                            <div className="flex flex-wrap gap-2">
                              {detectedFields.map(f => (
                                <span key={f.key} className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800">
                                  {f.label || f.key}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detected fields for builtin */}
                    {templateSource === 'builtin' && selectedBuiltin && (
                      <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-xs font-bold text-emerald-800 mb-2">✓ Field otomatis terdeteksi dari template bawaan:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedBuiltin.fields.map(f => (
                            <span key={f.key} className="px-3 py-1 bg-white border border-emerald-300 rounded-full text-xs font-semibold text-emerald-800">
                              {f.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setActiveTab(2)}
                      disabled={!step1Done || (!step2Done && templateSource === 'upload' && detectedFields.length === 0)}
                      className={`mt-2 px-8 py-3 rounded-xl font-bold text-white shadow transition-all ${step1Done && (step2Done || selectedBuiltin) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                      Lanjut: Input Data Peserta ➡️
                    </button>
                  </div>
                )}

                {/* ===== TAB 2: INPUT DATA ===== */}
                {activeTab === 2 && (
                  <div>
                    <h3 className="text-lg font-bold mb-1">Input Data Peserta</h3>
                    <p className="text-sm text-slate-500 mb-2">
                      Field template aktif: {' '}
                      {headers.map(h => <span key={h} className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold mr-1">{h}</span>)}
                    </p>

                    {headers.length === 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-sm text-amber-800">
                        ⚠️ Belum ada field yang dikonfigurasi. Kembali ke Langkah 1 dan pilih atau analisis template terlebih dahulu.
                      </div>
                    )}

                    {/* Tab switcher data input mode */}
                    <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
                      {['csv', 'manual_multi', 'ocr'].map(mode => (
                        <button key={mode} onClick={() => setBulkInputMode(mode)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${bulkInputMode === mode ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                          {mode === 'csv' ? '📁 Import CSV/Excel' : mode === 'manual_multi' ? '✍️ Input Manual' : '🤖 Scan Gambar SK'}
                        </button>
                      ))}
                    </div>

                    {/* CSV IMPORT */}
                    {bulkInputMode === 'csv' && (
                      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-sm font-semibold text-emerald-800 mb-1">Import File Excel / CSV</p>
                        <p className="text-xs text-emerald-700 mb-3">Pastikan kolom header CSV sesuai nama field: <strong>{headers.join(', ')}</strong></p>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="w-full p-2 border border-emerald-300 rounded-lg text-sm bg-white cursor-pointer" />
                      </div>
                    )}

                    {/* MANUAL MULTI-ROW */}
                    {bulkInputMode === 'manual_multi' && (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Input Data Manual — Isi satu per baris, lalu klik Tambahkan</p>
                        {headers.length === 0 ? (
                          <p className="text-xs text-amber-600">Konfigurasi field di Langkah 1 dulu.</p>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs mb-3">
                                <thead>
                                  <tr className="bg-slate-200 text-slate-600">
                                    <th className="px-3 py-2 text-left font-bold w-8">#</th>
                                    {headers.map(h => <th key={h} className="px-3 py-2 text-left font-bold capitalize">{h.replace(/_/g, ' ')}</th>)}
                                    <th className="px-2 py-2"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {multiRowInputs.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100">
                                      <td className="px-3 py-2 text-slate-400 font-medium">{idx + 1}</td>
                                      {headers.map(h => (
                                        <td key={h} className="px-2 py-1">
                                          <input
                                            type="text"
                                            value={row[h] || ''}
                                            onChange={e => updateMultiRow(idx, h, e.target.value)}
                                            placeholder={h.replace(/_/g, ' ')}
                                            className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-400 outline-none min-w-[100px]"
                                          />
                                        </td>
                                      ))}
                                      <td className="px-2 py-1">
                                        {multiRowInputs.length > 1 && (
                                          <button onClick={() => removeMultiRow(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={addMultiRow} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300">+ Tambah Baris</button>
                              <button onClick={applyMultiRowData} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow">Tambahkan ke Antrean ✓</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* OCR */}
                    {bulkInputMode === 'ocr' && (
                      <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-xl relative">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">✨ Smart AI</div>
                        <p className="text-sm font-bold text-indigo-900 mb-1">Scan Gambar Daftar Hadir</p>
                        <p className="text-xs text-indigo-700 mb-3">Upload foto daftar hadir — AI akan membaca dan mengekstrak nama peserta.</p>
                        <input type="file" accept="image/*" onChange={handleOCRImageUpload} className="w-full p-2 border border-indigo-200 rounded-lg text-xs bg-white mb-2 cursor-pointer" />
                        {ocrImage && <img src={ocrImage} className="w-full max-h-24 object-cover border border-indigo-200 rounded-lg mb-2 shadow-sm" alt="Scan" />}
                        {rawText && (
                          <div className="mt-2">
                            <textarea value={rawText} onChange={e => setRawText(e.target.value)} className="w-full text-[10px] p-2 border border-indigo-200 rounded h-16 mb-2 bg-white" />
                            <button onClick={handleAICleansing} disabled={isCleaning || isExtracting} className="w-full py-2 bg-indigo-600 text-white text-xs rounded-lg font-bold hover:bg-indigo-700 disabled:bg-indigo-300">
                              {isCleaning ? 'Merangkum dengan AI...' : '✨ Rapikan & Masukkan Data'}
                            </button>
                          </div>
                        )}
                        {isExtracting && <p className="text-xs text-indigo-600 mt-2 animate-pulse">Memindai gambar...</p>}
                      </div>
                    )}

                    {/* Data Queue Preview */}
                    {participants.length > 0 && (
                      <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 p-4 border-b border-slate-200 gap-4">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">✓</div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Antrean Siap: {participants.length} Dokumen</p>
                              <p className="text-xs text-slate-500">Pratinjau data yang siap dicetak</p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleResetData} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold transition-colors">Kosongkan</button>
                            <button onClick={() => setActiveTab(3)} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-md transition-all">Lanjut Desain ➡️</button>
                          </div>
                        </div>
                        <div className="bg-white max-h-64 overflow-y-auto">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0 shadow-sm">
                              <tr>
                                <th className="px-4 py-3 font-bold w-12">No</th>
                                {headers.map((h, idx) => <th key={idx} className="px-4 py-3 font-bold">{h.replace(/_/g,' ')}</th>)}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {participants.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 font-medium text-slate-400">{i + 1}</td>
                                  {headers.map((h, idx) => <td key={idx} className="px-4 py-2">{p[h] || '—'}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== TAB 3: LAYOUT & PRINT ===== */}
                {activeTab === 3 && (
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Panel */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                      <h3 className="text-lg font-bold">Penyesuaian & Cetak</h3>

                      {/* QR Toggle */}
                      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-bold">🛡️</span>
                          <div>
                            <p className="text-xs font-bold text-indigo-900">Validasi QR Code Resmi</p>
                            <p className="text-[10px] text-indigo-700">Sematkan kode pengaman otomatis</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={enableQR} onChange={() => setEnableQR(!enableQR)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Field Position Controls */}
                      {headers.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-400 mb-2">Posisi & Gaya Field (klik gambar untuk geser):</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {headers.map(h => (
                              <button key={h} onClick={() => setActiveField(h)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${activeField === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                                {h.replace(/_/g,' ').toUpperCase()}
                              </button>
                            ))}
                          </div>
                          {activeField && fieldConfigs[activeField] && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Ukuran Font: {fieldConfigs[activeField].size}pt</label>
                                <input type="range" min="8" max="80" value={fieldConfigs[activeField].size}
                                  onChange={e => updateConfig(activeField, 'size', e.target.value)}
                                  className="w-full accent-indigo-600" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Warna Teks</label>
                                <input type="color" value={fieldConfigs[activeField].color}
                                  onChange={e => updateConfig(activeField, 'color', e.target.value)}
                                  className="w-full h-8 rounded border p-0 cursor-pointer" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Posisi X: {Math.round(fieldConfigs[activeField].x)}%</label>
                                <input type="range" min="0" max="100" value={fieldConfigs[activeField].x}
                                  onChange={e => updateConfig(activeField, 'x', parseFloat(e.target.value))}
                                  className="w-full accent-indigo-600" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Posisi Y: {Math.round(fieldConfigs[activeField].y)}%</label>
                                <input type="range" min="0" max="100" value={fieldConfigs[activeField].y}
                                  onChange={e => updateConfig(activeField, 'y', parseFloat(e.target.value))}
                                  className="w-full accent-indigo-600" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {participants.length === 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                          ⚠️ Belum ada data peserta. Kembali ke Langkah 2.
                        </div>
                      )}

                      <button
                        onClick={generateCertificates}
                        disabled={isProcessing || !template || participants.length === 0}
                        className={`w-full py-4 mt-auto rounded-xl font-bold text-white shadow-lg transition-all text-sm ${isProcessing || !template || participants.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {isProcessing ? '⏳ Memproses & Mengompres...' : `🖨️ Cetak Massal ${participants.length} Dokumen`}
                      </button>
                    </div>

                    {/* Right: Canvas Preview */}
                    <div className="w-full md:w-2/3">
                      <p className="text-sm font-semibold text-slate-500 mb-2">Pratinjau Tata Letak (klik gambar untuk geser posisi teks aktif)</p>
                      {!template ? (
                        <div className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 bg-slate-50">Belum ada template dipilih</div>
                      ) : (
                        <div
                          className={`relative w-full cursor-crosshair border shadow-md rounded-lg overflow-hidden bg-white mx-auto ${documentType === 'id_card' ? 'max-w-xs' : documentType === 'surat' ? 'max-w-md' : 'max-w-full'}`}
                          onClick={handleImageClick}
                        >
                          <img ref={imageRef} src={template} alt="Preview" className="w-full h-auto object-contain pointer-events-none" />
                          {headers.map(header => {
                            const config = fieldConfigs[header];
                            if (!config) return null;
                            return (
                              <div
                                key={header}
                                className="absolute pointer-events-none -translate-y-1/2 -translate-x-1/2"
                                style={{ left: `${config.x}%`, top: `${config.y}%`, zIndex: activeField === header ? 20 : 10 }}
                              >
                                <span
                                  style={{
                                    fontSize: `${Math.max(8, config.size / 2)}px`,
                                    color: config.color,
                                    border: activeField === header ? '2px dashed #4f46e5' : '1px solid transparent',
                                    backgroundColor: activeField === header ? 'rgba(255,255,255,0.85)' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                  className="font-bold whitespace-nowrap"
                                >
                                  [{header.replace(/_/g, ' ')}]
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {participants.length > 0 && (
                        <p className="text-xs text-center text-slate-400 mt-2">
                          Pratinjau menampilkan posisi field. Output akhir: {participants.length} file PDF dalam 1 ZIP.
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

