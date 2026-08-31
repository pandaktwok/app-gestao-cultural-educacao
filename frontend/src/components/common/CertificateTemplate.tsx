import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CertificateTemplateProps {
  studentName: string;
  schoolName: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  instructorName: string;
  directorName?: string;
  projectName?: string;
  hash: string;
  attendanceRate: number;
  onClose?: () => void;
}

export const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  studentName,
  schoolName,
  eventName,
  eventDate,
  eventLocation = 'Criciúma - SC',
  instructorName,
  directorName = 'Coordenação Geral de Projetos',
  projectName = 'Projeto Cultural & Arte nas Escolas',
  hash,
  attendanceRate,
  onClose,
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/validar-certificado/${hash}`
    : `http://localhost:3000/validar-certificado/${hash}`;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      if (typeof window !== 'undefined') {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const element = certRef.current;
        if (element) {
          const sanitizedStudent = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
          const opt = {
            margin: [0.2, 0.2, 0.2, 0.2],
            filename: `Certificado_${sanitizedStudent}_${hash}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
          };
          await html2pdf().set(opt).from(element).save();
        }
      }
    } catch (err) {
      console.error('Error generating certificate PDF:', err);
      alert('Erro ao gerar PDF do certificado.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '25/07/2026';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '25/07/2026' : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-gray-900 text-white p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-400 text-amber-950 rounded-xl">
            <Award size={22} />
          </div>
          <div>
            <h4 className="text-sm font-black">Certificado de Participação Cultural</h4>
            <p className="text-[11px] text-gray-300 font-medium">
              Aluno: <strong className="text-white">{studentName}</strong> • Frequência: <strong className="text-emerald-400">{attendanceRate}%</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download size={16} />
            {downloading ? 'Baixando PDF...' : 'Download PDF Landscape'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Printable Landscape A4 Certificate Container */}
      <div className="overflow-x-auto flex justify-center p-2 bg-gray-200 rounded-3xl">
        <div
          ref={certRef}
          className="bg-amber-50/40 text-gray-900 p-8 rounded-2xl shadow-2xl relative font-serif border-[12px] border-amber-700"
          style={{ width: '920px', minHeight: '620px' }}
        >
          {/* Inner Decorative Golden Border */}
          <div className="border-2 border-amber-600/60 p-6 rounded-lg h-full flex flex-col justify-between space-y-6 relative bg-white/90">
            {/* Corner Ornamental Accents */}
            <div className="absolute top-2 left-2 text-amber-600 text-xs font-mono select-none">❖</div>
            <div className="absolute top-2 right-2 text-amber-600 text-xs font-mono select-none">❖</div>
            <div className="absolute bottom-2 left-2 text-amber-600 text-xs font-mono select-none">❖</div>
            <div className="absolute bottom-2 right-2 text-amber-600 text-xs font-mono select-none">❖</div>

            {/* Header: Institutional Branding */}
            <div className="text-center space-y-1 border-b border-amber-200 pb-4">
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Sociedade Cultural Cruzeiro do Sul & Secretaria de Estado da Cultura
              </span>
              <h2 className="text-2xl font-black font-sans text-gray-950 tracking-tight pt-2">
                CERTIFICADO DE PARTICIPAÇÃO CULTURAL
              </h2>
              <p className="text-xs font-sans text-amber-900 font-bold uppercase tracking-wider">
                {projectName}
              </p>
            </div>

            {/* Certificate Body Text */}
            <div className="text-center space-y-4 px-8 py-2">
              <p className="text-sm font-sans text-gray-700 font-medium">
                Certificamos para os devidos fins institucionais que o(a) aluno(a)
              </p>

              <h1 className="text-3xl font-black text-amber-950 font-sans tracking-tight border-b-2 border-amber-500 inline-block pb-1 px-6">
                {studentName}
              </h1>

              <p className="text-sm font-sans text-gray-800 leading-relaxed max-w-2xl mx-auto pt-2">
                participou com excelente aproveitamento e assiduidade do evento cultural e ensaio regional{' '}
                <strong className="text-gray-950 font-bold">"{eventName}"</strong>, representando com destaque a unidade escolar{' '}
                <strong className="text-gray-950 font-bold">{schoolName}</strong>, obtendo uma taxa de frequência presencial de{' '}
                <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  {attendanceRate}%
                </span>.
              </p>
            </div>

            {/* Footer Signatures and QR Code Validation */}
            <div className="pt-6 border-t border-amber-200 grid grid-cols-3 gap-6 items-end font-sans">
              {/* Dual Signature 1: Instructor */}
              <div className="text-center space-y-1">
                <div className="border-b border-gray-900 w-44 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-950">{instructorName}</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase">Professor / Instrutor Cultural</p>
              </div>

              {/* Dual Signature 2: Directory */}
              <div className="text-center space-y-1">
                <div className="border-b border-gray-900 w-44 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-950">{directorName}</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase">Diretoria Executiva de Projetos</p>
              </div>

              {/* QR Code Validation Box */}
              <div className="flex items-center gap-3 bg-amber-50/80 p-2.5 rounded-xl border border-amber-300">
                <div className="bg-white p-1.5 rounded-lg border border-amber-200 shrink-0">
                  <QRCodeSVG value={verificationUrl} size={64} level="M" />
                </div>
                <div className="space-y-0.5 text-left">
                  <span className="text-[9px] font-extrabold uppercase text-amber-900 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-600" /> Autenticidade Digital
                  </span>
                  <p className="text-[10px] font-mono font-bold text-gray-800 tracking-wider">
                    CÓD: {hash}
                  </p>
                  <p className="text-[8px] text-gray-500 font-medium leading-tight">
                    {eventLocation}, {formatDate(eventDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
