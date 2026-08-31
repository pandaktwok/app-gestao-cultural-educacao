'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, XCircle, CheckCircle2, Award, Calendar, Building2, User, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ValidationResult {
  valid: boolean;
  hash?: string;
  issueDate?: string;
  attendanceRate?: number;
  studentName?: string;
  schoolName?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  instructorName?: string;
  projectName?: string;
  error?: string;
}

export default function ValidateCertificatePage({ params }: { params: { hash: string } }) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.hash) {
      verifyHash(params.hash);
    }
  }, [params.hash]);

  const verifyHash = async (code: string) => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${backendUrl}/certificates/verify/${code}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error verifying certificate:', err);
      setResult({ valid: false, error: 'Erro de comunicação com o servidor de validação.' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white p-4 sm:p-8 font-sans flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Top Institutional Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-400 text-amber-950 flex items-center justify-center font-black mx-auto shadow-xl">
            <Award size={36} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/80">
            Validador Público de Documentos Oficiais
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Sociedade Cultural Cruzeiro do Sul
          </h1>
          <p className="text-xs text-gray-400">
            Verificação em tempo real de autenticidade de Certificados de Participação Cultural
          </p>
        </div>

        {/* Validation Card Result */}
        {loading ? (
          <div className="p-8 bg-gray-800/90 border border-gray-700 rounded-3xl text-center space-y-3 shadow-2xl">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-300 font-bold">Verificando autenticidade do código {params.hash}...</p>
          </div>
        ) : result?.valid ? (
          <div className="p-6 bg-gray-800/90 border-2 border-emerald-500/80 rounded-3xl space-y-6 shadow-2xl backdrop-blur-md animate-fadeIn">
            {/* Green Seal Status */}
            <div className="flex items-center gap-4 bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shrink-0 shadow-lg">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  DOCUMENTO AUTÊNTICO E VÁLIDO
                </span>
                <h3 className="text-lg font-black text-white">
                  Certificado Verificado com Sucesso!
                </h3>
                <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                  Código de Autenticação: <strong className="text-white">{result.hash}</strong>
                </p>
              </div>
            </div>

            {/* Student & Event Metadata Details */}
            <div className="space-y-3">
              <div className="p-4 bg-gray-900/90 rounded-2xl border border-gray-700/80 space-y-1">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <User size={13} /> Aluno(a) Certificado(a)
                </span>
                <p className="text-lg font-black text-white">{result.studentName}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                  <Building2 size={12} className="text-gray-500" /> Escola: <strong className="text-gray-200">{result.schoolName}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-900/90 rounded-2xl border border-gray-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Evento Cultural
                  </span>
                  <p className="text-xs font-black text-white truncate">{result.eventName}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Data: {formatDate(result.eventDate)}</p>
                </div>

                <div className="p-3 bg-gray-900/90 rounded-2xl border border-gray-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Projeto & Assiduidade
                  </span>
                  <p className="text-xs font-black text-white truncate">{result.projectName}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">Frequência Presencial: {result.attendanceRate}%</p>
                </div>
              </div>

              <div className="p-3 bg-gray-900/90 rounded-2xl border border-gray-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Professor Instrutor</span>
                  <span className="font-extrabold text-gray-200">{result.instructorName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Emissão do Selo</span>
                  <span className="font-extrabold text-gray-200">{formatDate(result.issueDate)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] text-gray-500 font-medium">
              * Este documento possui validação criptográfica oficial registrada na base da Sociedade Cultural Cruzeiro do Sul.
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-800/90 border-2 border-rose-500/80 rounded-3xl space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-4 bg-rose-950/80 border border-rose-500/50 p-4 rounded-2xl">
              <div className="p-3 bg-rose-500 text-white rounded-2xl shrink-0 shadow-lg">
                <XCircle size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                  CÓDIGO INVÁLIDO OU NÃO ENCONTRADO
                </span>
                <h3 className="text-lg font-black text-white">
                  Não foi possível validar este certificado.
                </h3>
                <p className="text-xs text-rose-200/80 font-mono mt-0.5">
                  Código consultado: <strong>{params.hash}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-300 text-center font-medium">
              {result?.error || 'Verifique se o código impresso no QR Code está correto ou se o certificado foi emitido pela coordenação.'}
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition shadow-lg"
          >
            <ArrowLeft size={16} /> Voltar ao App da Gestão Cultural
          </Link>
        </div>
      </div>
    </main>
  );
}
