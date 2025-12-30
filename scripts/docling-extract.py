#!/usr/bin/env python3
"""
Docling PDF Extractor

PDFからテキストとメタデータを抽出するスクリプト
Node.jsから呼び出される

Usage:
    python scripts/docling-extract.py <pdf_path> [--output <json_path>]
    python scripts/docling-extract.py --url <arxiv_pdf_url> [--output <json_path>]
"""

import argparse
import json
import sys
import tempfile
from pathlib import Path
from datetime import datetime

def extract_pdf(pdf_source: str, is_url: bool = False) -> dict:
    """PDFからテキストを抽出"""
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import PdfFormatOption
    
    # パイプラインオプション（OCR無効、高速化）
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False  # OCR無効（テキストPDFのみ対象）
    pipeline_options.do_table_structure = True  # テーブル構造認識
    
    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    # 変換実行
    result = converter.convert(pdf_source)
    doc = result.document
    
    # テキスト抽出
    full_text = doc.export_to_markdown()
    
    # メタデータ
    metadata = {
        "title": doc.name if hasattr(doc, 'name') else None,
        "num_pages": len(doc.pages) if hasattr(doc, 'pages') else 0,
        "source": pdf_source,
    }
    
    # ページごとのテキスト（可能な場合）
    pages = []
    if hasattr(doc, 'pages'):
        for i, page in enumerate(doc.pages):
            page_text = ""
            if hasattr(page, 'items'):
                for item in page.items:
                    if hasattr(item, 'text'):
                        page_text += item.text + "\n"
            pages.append({
                "page_number": i + 1,
                "text": page_text.strip()
            })
    
    # テーブル抽出
    tables = []
    if hasattr(doc, 'tables'):
        for i, table in enumerate(doc.tables):
            tables.append({
                "index": i,
                "markdown": table.export_to_markdown() if hasattr(table, 'export_to_markdown') else str(table)
            })
    
    return {
        "text": full_text,
        "metadata": metadata,
        "pages": pages,
        "tables": tables,
        "stats": {
            "total_characters": len(full_text),
            "total_words": len(full_text.split()),
            "num_tables": len(tables),
        }
    }


def download_and_extract(url: str) -> dict:
    """URLからPDFをダウンロードして抽出"""
    import requests
    
    # ダウンロード
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    
    # 一時ファイルに保存
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(response.content)
        temp_path = f.name
    
    try:
        result = extract_pdf(temp_path)
        result["metadata"]["url"] = url
        return result
    finally:
        Path(temp_path).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Extract text from PDF using Docling")
    parser.add_argument("pdf_path", nargs="?", help="Path to PDF file")
    parser.add_argument("--url", help="URL to download PDF from")
    parser.add_argument("--output", "-o", help="Output JSON file path")
    parser.add_argument("--pretty", action="store_true", help="Pretty print JSON")
    
    args = parser.parse_args()
    
    if not args.pdf_path and not args.url:
        parser.error("Either pdf_path or --url is required")
    
    try:
        if args.url:
            result = download_and_extract(args.url)
        else:
            result = extract_pdf(args.pdf_path)
        
        result["extracted_at"] = datetime.now().isoformat()
        
        # 出力
        json_output = json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None)
        
        if args.output:
            Path(args.output).write_text(json_output, encoding="utf-8")
            print(f"Output saved to {args.output}", file=sys.stderr)
        else:
            print(json_output)
            
    except Exception as e:
        error_result = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
