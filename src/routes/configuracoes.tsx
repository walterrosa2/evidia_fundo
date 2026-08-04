import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Shield, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";

export const Route = createFileRoute("/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <AppShell context="Configurações">
      <SectionHeader
        eyebrow="Organização"
        title="Configurações"
        subtitle="Visão demonstrativa das configurações da organização. Nenhuma alteração é persistida."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={Building2} title="Organização">
          <KV k="Razão social" v="Atlas Capital Litigation Partners" />
          <KV k="Plano" v="EvidIA Enterprise · 25 seats" />
          <KV k="Região de dados" v="South America (SP)" />
        </Card>

        <Card icon={Users} title="Usuários">
          {[
            ["M. Almeida", "Sócio · Admin"],
            ["C. Bernardes", "Analista sênior"],
            ["R. Tavares", "Jurídico"],
            ["F. Khouri", "Compliance"],
          ].map(([n, r]) => (
            <div
              key={n}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm">{n}</span>
              <span className="text-xs text-muted-foreground">{r}</span>
            </div>
          ))}
        </Card>

        <Card icon={Shield} title="Segurança e retenção">
          <KV k="MFA" v="Obrigatório · TOTP" />
          <KV k="Criptografia" v="AES-256 em repouso · TLS 1.3 em trânsito" />
          <KV k="Retenção de documentos" v="7 anos" />
          <KV k="Auditoria" v="Logs imutáveis · WORM" />
        </Card>

        <Card icon={FileText} title="Modelos de relatório">
          {[
            "Investment Memo · Comitê",
            "Resumo executivo · Cedente",
            "Relatório técnico · Jurídico",
            "Sumário de evidências · Auditor",
          ].map((m) => (
            <div
              key={m}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm">{m}</span>
              <span className="text-xs text-muted-foreground">Somente leitura</span>
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </div>
      <div className="mt-4 divide-y divide-border">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm font-medium">{v}</span>
    </div>
  );
}
