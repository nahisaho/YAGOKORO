/**
 * Ingest Module - Document Ingestion Pipeline
 *
 * Provides tools for fetching and processing documents from various sources
 * (arXiv, PDFs) into TextChunks for LazyGraphRAG processing.
 */

// arXiv API Client
export {
  ArxivClient,
  type ArxivPaper,
  type ArxivSearchOptions,
  type ArxivSearchResult,
} from './ArxivClient.js';

// Unstructured.io Client
export {
  UnstructuredClient,
  type UnstructuredElement,
  type UnstructuredElementType,
  type UnstructuredOptions,
  type PartitionResult,
} from './UnstructuredClient.js';

// Document Processor Pipeline
export {
  DocumentProcessor,
  createDocumentProcessor,
  type ProcessedDocument,
  type DocumentProcessorOptions,
} from './DocumentProcessor.js';

// Docling PDF Extractor (Local, no API required)
export {
  DoclingExtractor,
  type DoclingExtractionResult,
  type DoclingError,
  type DoclingExtractorOptions,
} from './DoclingExtractor.js';

// Docling Document Processor (Local, no API required)
export {
  DoclingDocumentProcessor,
  createDoclingProcessor,
  type DoclingProcessedDocument,
  type DoclingProcessorOptions,
} from './DoclingDocumentProcessor.js';

// Unpaywall API Client
export {
  UnpaywallClient,
  type UnpaywallPaper,
  type UnpaywallSearchResult,
  type UnpaywallClientOptions,
  type OALocation,
} from './UnpaywallClient.js';

// Unpaywall Document Processor
export {
  UnpaywallDocumentProcessor,
  createUnpaywallProcessor,
  type UnpaywallProcessedDocument,
  type UnpaywallProcessorOptions,
  type PaperDefinition,
  type ProcessResults,
} from './UnpaywallDocumentProcessor.js';
