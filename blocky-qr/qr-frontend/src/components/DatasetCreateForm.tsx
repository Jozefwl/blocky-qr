"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createDataset } from "@/lib/api";

type DatasetType = "aggregation" | "file";

export function DatasetCreateForm() {
  const router = useRouter();
  const [type, setType] = useState<DatasetType>("aggregation");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [fileLink, setFileLink] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (type === "aggregation") {
        if (!timeFrom || !timeTo) {
          setError("Vyplňte časové rozmezí.");
          setPending(false);
          return;
        }
        body = {
          name: name.trim(),
          owner: owner.trim(),
          type: "aggregation",
          aggregation: {
            timeFrom: new Date(timeFrom).toISOString(),
            timeTo: new Date(timeTo).toISOString(),
          },
        };
      } else {
        body = {
          name: name.trim(),
          owner: owner.trim(),
          type: "file",
          fileType: { format: "json", structure: "array-of-objects" },
          ...(fileLink.trim() ? { fileLink: fileLink.trim() } : {}),
        };
      }

      const created = await createDataset(body);
      router.push(`/datasets/${created._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vytvoření selhalo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      <h2 className="card-title">Nový dataset</h2>
      <form onSubmit={submit} className="form-create">
        <label className="form-field">
          <span>Typ</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as DatasetType)}
          >
            <option value="aggregation">Agregace (časové okno)</option>
            <option value="file">Soubor (JSON)</option>
          </select>
        </label>

        <label className="form-field">
          <span>Název</span>
          <input
            className="input"
            required
            minLength={1}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Vlastník</span>
          <input
            className="input"
            required
            minLength={1}
            maxLength={100}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>

        {type === "aggregation" ? (
          <>
            <label className="form-field">
              <span>Od</span>
              <input
                className="input"
                type="datetime-local"
                required
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Do</span>
              <input
                className="input"
                type="datetime-local"
                required
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="form-field">
            <span>URL souboru (volitelné)</span>
            <input
              className="input"
              type="url"
              placeholder="https://…"
              value={fileLink}
              onChange={(e) => setFileLink(e.target.value)}
            />
          </label>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Ukládám…" : "Vytvořit dataset"}
        </button>
      </form>
    </div>
  );
}
