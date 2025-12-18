import "./methodology.css";

const Methodlogy = () => {
  return (
    <div className="methodology-container">
      <h1>Methodology</h1>

      <section>
        <h2>1. Automated Legal Document Processing</h2>
        <p>
          The system uses an automated script to process mining legislation
          documents (Acts, Rules, Regulations) in PDF format. Each document is
          parsed and structured to enable efficient retrieval and reasoning.
        </p>
      </section>

      <section>
        <h2>2. Intelligent Chunking Strategy</h2>
        <p>
          Extracted text is segmented into semantically meaningful chunks using
          a section-based strategy (e.g., Chapters, Rules, Clauses). This ensures
          that legal context is preserved while avoiding overly large passages.
        </p>

        <div className="code-box">
          <pre>
{`split_reason: "by_section"
section_title: "CHAPTER I"
chunk_index: 0`}
          </pre>
        </div>
      </section>

      <section>
        <h2>3. Metadata Enrichment</h2>
        <p>
          Each chunk is enriched with domain-specific metadata to reduce
          hallucination and improve legal grounding during inference.
        </p>

        <ul>
          <li><strong>Document identity:</strong> file_name, doc_hint</li>
          <li><strong>Jurisdiction:</strong> country, jurisdiction_level</li>
          <li><strong>Mining scope:</strong> mineral_scope</li>
          <li><strong>Structural context:</strong> section_title, chunk_index</li>
          <li><strong>Traceability:</strong> source_path, created_at</li>
        </ul>
      </section>

      <section>
        <h2>4. Unified Data Model</h2>
        <p>
          After processing, each chunk follows a consistent schema stored in
          MongoDB and indexed in Pinecone for vector search.
        </p>

        <div className="code-box">
          <pre>
{`{
  _id: "efc3131b-a20e-48a7-bfc0-78ea0070a493",
  file_name: "coal_mines_regulation_2017.pdf",
  doc_hint: "Coal Mines Regulation 2017",
  jurisdiction_level: "national",
  mineral_scope: "all",
  section_title: "CHAPTER I",
  chunk_index: 0,
  text: "CHAPTER I PRELIMINARY",
  is_pinecone_upserted: true
}`}
          </pre>
        </div>
      </section>

      <section>
        <h2>5. Vector Indexing (Pinecone)</h2>
        <p>
          Each chunk is embedded and stored in Pinecone with namespace-level
          separation (e.g., by country or regulation). This enables fast,
          filtered similarity search during RAG inference.
        </p>
      </section>

      <section>
        <h2>6. Dual Inference Approaches</h2>

        <h3>6.1 Retrieval-Augmented Generation (RAG)</h3>
        <p>
          In RAG mode, user queries are matched against relevant chunks using
          vector similarity. Retrieved legal passages are injected into the LLM
          prompt to generate grounded, citation-aware responses.
        </p>

        <h3>6.2 Training-Based Approach</h3>
        <p>
          In the trained approach, curated and validated chunks are used to
          fine-tune or instruction-tune a model. This allows the system to
          internalize domain-specific legal language and recurring regulatory
          patterns.
        </p>
      </section>

      <section>
        <h2>7. Hallucination Control & Legal Reliability</h2>
        <p>
          By combining structured metadata, jurisdiction filters, and controlled
          retrieval, the system minimizes cross-country legal mixing and
          unsupported claims — a critical requirement for mining legislation
          compliance systems.
        </p>
      </section>
    </div>
  );
};

export default Methodlogy;

