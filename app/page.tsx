export default function Home() {
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 16px",
      }}
    >
      <header style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          Spanish Learning MCP
        </h1>
        <p style={{ color: "#666" }}>
          A Model Context Protocol for Spanish language learning applications
        </p>
      </header>

      <main>
        <section style={{ marginBottom: "32px" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            About This Project
          </h2>
          <p style={{ marginBottom: "16px" }}>
            Please follow the readme instructions in the repo because everything
            is well documented.
          </p>
          <p style={{ marginBottom: "16px" }}>
            This project is a demonstration of the Model Context Protocol (MCP)
            for Spanish language learning applications. It provides a way to
            integrate context from vocabulary and grammar data into AI models,
            specifically Claude AI.
          </p>
          <p>
            The MCP functionality is implemented in{" "}
            <code
              style={{
                backgroundColor: "#f5f5f5",
                padding: "2px 4px",
                borderRadius: "3px",
              }}
            >
              contexts/claude/claude-mcp.ts
            </code>
            . Check out the examples in{" "}
            <code
              style={{
                backgroundColor: "#f5f5f5",
                padding: "2px 4px",
                borderRadius: "3px",
              }}
            >
              contexts/claude/example.mjs
            </code>{" "}
            and{" "}
            <code
              style={{
                backgroundColor: "#f5f5f5",
                padding: "2px 4px",
                borderRadius: "3px",
              }}
            >
              contexts/claude/simple-demo.mjs
            </code>{" "}
            to see how to use it.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            Getting Started
          </h2>
          <ol
            style={{
              listStyleType: "decimal",
              paddingLeft: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <li>Clone this repository</li>
            <li>
              Install dependencies:{" "}
              <code
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                npm install
              </code>
            </li>
            <li>
              Create a{" "}
              <code
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                .env.local
              </code>{" "}
              file with your API keys:
              <pre
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "8px",
                  marginTop: "8px",
                  borderRadius: "4px",
                  whiteSpace: "pre-wrap",
                }}
              >
                ANTHROPIC_API_KEY=your_anthropic_api_key <br />
                NEXT_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint <br />
                NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id <br />
                NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_appwrite_database_id{" "}
                <br />
                NEXT_PUBLIC_APPWRITE_VOCABULARY_COLLECTION_ID=your_vocabulary_collection_id{" "}
                <br />
                NEXT_PUBLIC_APPWRITE_GRAMMAR_COLLECTION_ID=your_grammar_collection_id{" "}
                <br />
              </pre>
            </li>
            <li>
              Run the example:{" "}
              <code
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                node contexts/claude/example.mjs
              </code>
            </li>
          </ol>
        </section>
      </main>

      <footer
        style={{
          marginTop: "48px",
          paddingTop: "32px",
          borderTop: "1px solid #eee",
          textAlign: "center",
          color: "#666",
        }}
      >
        <p>
          &copy; {new Date().getFullYear()} This Dot Labs. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
