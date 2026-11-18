import { useId, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { api, ApiError, queryKeys } from "@/lib/operacao/api";
import {
  ErrorNotice,
  inputClass,
  labelClass,
  primaryButton,
} from "@/components/operacao/primitives";

export const Route = createFileRoute("/operacao/login")({
  head: () => ({ meta: [{ title: "Acesso operacional — EvidIA" }] }),
  component: OperationalLogin,
});

function OperationalLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useId();
  const passwordId = useId();
  const userRef = useRef<HTMLInputElement>(null);

  const login = useMutation({
    mutationFn: (form: { username: string; password: string }) =>
      api.login(form.username, form.password),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      navigate({ to: "/operacao" });
    },
    onError: () => userRef.current?.focus(),
  });

  const invalid = login.error instanceof ApiError && login.error.code === "invalid_credentials";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate({
      username: String(data.get("username") ?? ""),
      password: String(data.get("password") ?? ""),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <main className="w-full max-w-sm">
        <img
          src="/brand/evidia-logo.png"
          alt="EvidIA"
          width={144}
          height={40}
          className="h-auto w-36"
        />
        <div className="mt-8 text-[11px] uppercase tracking-[0.2em] text-primary">
          Ambiente operacional
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Acesso à Operação</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sessão autenticada no backend da Evidia. Os dados desta área são persistentes e isolados
          por organização.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor={userId} className={labelClass}>
              Usuário
            </label>
            <input
              ref={userRef}
              id={userId}
              name="username"
              type="text"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              required
              aria-invalid={invalid || undefined}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={passwordId} className={labelClass}>
              Senha
            </label>
            <input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={invalid || undefined}
              className={inputClass}
            />
          </div>

          <div aria-live="polite">
            {login.isError &&
              (invalid ? (
                <p role="alert" className="text-sm text-risk-critical">
                  Usuário ou senha inválidos. Confira os dados e tente novamente.
                </p>
              ) : (
                <ErrorNotice error={login.error} />
              ))}
          </div>

          <button type="submit" disabled={login.isPending} className={`${primaryButton} w-full`}>
            {login.isPending ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                Entrando…
              </>
            ) : (
              <>
                Entrar na Operação
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-xs text-muted-foreground">
          Procura a demonstração para investidores?{" "}
          <Link to="/pipeline" className="text-primary underline-offset-4 hover:underline">
            Abrir a demo
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
