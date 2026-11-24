# Pré-validação automática — EduCAD 2D v8.9

Feita em 24/11/2026 com leitores de DXF independentes do EduCAD, antes da conferência no AutoCAD e no ZWCAD (que só pode ser feita por uma pessoa, com as licenças da instituição).

Leitores: **ezdxf** 1.4.5 (auditoria completa, igual em espírito ao AUDIT do AutoCAD), **dxfgrabber** 1.0.0, **dxf-parser** e **dxf** (Node.js, usados por visualizadores web; o segundo também desenha o arquivo).

| Arquivo | Versão | ezdxf: erros / correções | dxfgrabber | dxf-parser | dxf (desenho) | Entidades no Model |
|---|---|---|---|---|---|---|
| 01-geometria.dxf | AC1015 | 0 / 0 | lido (13) | lido | desenhado (11 elementos) | ARC 1, CIRCLE 1, ELLIPSE 1, LINE 2, LWPOLYLINE 3, POINT 3, SPLINE 1, TEXT 1 |
| 01-geometria-R12.dxf | AC1009 | 0 / 0 | lido (13) | lido | desenhado (9 elementos) | ARC 1, CIRCLE 1, LINE 2, POINT 3, POLYLINE 5, TEXT 1 |
| 02-texto-e-cotas.dxf | AC1015 | 0 / 0 | lido (10) | lido | desenhado (5 elementos) | CIRCLE 1, DIMENSION 6, LINE 3, LWPOLYLINE 1, MTEXT 1, SOLID 1, TEXT 3 |
| 02-texto-e-cotas-R12.dxf | AC1009 | 0 / 0 | lido (45) | lido | desenhado (22 elementos) | ARC 1, CIRCLE 1, LINE 19, POLYLINE 1, SOLID 12, TEXT 11 |
| 03-hachuras.dxf | AC1015 | 0 / 0 | lido (16) | lido | desenhado (8 elementos) | CIRCLE 1, HATCH 7, LWPOLYLINE 7, TEXT 8 |
| 03-hachuras-R12.dxf | AC1009 | 0 / 0 | lido (475) | lido | desenhado (467 elementos) | CIRCLE 1, LINE 459, POLYLINE 7, TEXT 8 |
| 04-camadas-e-blocos.dxf | AC1015 | 0 / 0 | lido (18) | lido | desenhado (16 elementos) | INSERT 3, LINE 7, TEXT 8 |
| 04-camadas-e-blocos-R12.dxf | AC1009 | 0 / 0 | lido (24) | lido | desenhado (16 elementos) | CIRCLE 3, LINE 13, TEXT 8 |
| 05-layout-escala.dxf | AC1015 | 0 / 0 | lido (13) | lido | desenhado (11 elementos) | DIMENSION 1, LWPOLYLINE 2, TEXT 1 |
| 05-layout-escala-R12.dxf | AC1009 | 0 / 0 | lido (9) | lido | desenhado (5 elementos) | LINE 3, POLYLINE 2, SOLID 2, TEXT 2 |

**Valores esperados conferidos no arquivo:** 34 de 34.


**PDF de calibração:** página 297.0 × 210.0 mm; 3 traços de exatamente 100,0 mm encontrados no arquivo.

**Prévias** desenhadas pelo pacote independente `dxf` (não pelo EduCAD), em `previas/`: `01-geometria.png`, `02-texto-e-cotas.png`, `03-hachuras.png`, `04-camadas-e-blocos.png`, `05-layout-escala.png`.

**Resultado geral:** ✓ todos os arquivos foram lidos sem erros e todos os valores esperados conferem.

O que esta pré-validação **não** substitui: abrir no AutoCAD e no ZWCAD reais, medir a impressão em papel e testar num tablet. Siga `ROTEIRO.md`.
