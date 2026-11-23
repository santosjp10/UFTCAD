#!/usr/bin/env python3
"""EduCAD 2D — montagem do aplicativo.

O código-fonte fica dividido em módulos em src/:
  src/app.html       estrutura da página (com os marcadores @@CSS@@ e @@JS@@)
  src/css/app.css    estilos
  src/js/NN-*.js     módulos JavaScript, carregados em ordem numérica

Uso:
  python build.py           gera index.html (arquivo único, funciona offline e no GitHub Pages)
                            e src/dev.html (carrega os módulos separados, para desenvolvimento)
  python build.py --check   confere se index.html está atualizado em relação a src/ (usado no CI)

Requer apenas Python 3 (sem dependências).
"""
import os, sys, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

def read(p):
    with open(p, encoding='utf8', newline='') as f:
        return f.read()

def modules():
    return sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))

def build_single():
    tpl = read(os.path.join(SRC, 'app.html'))
    css = read(os.path.join(SRC, 'css', 'app.css'))
    js = ''.join(read(m) for m in modules())
    assert tpl.count('@@CSS@@') == 1 and tpl.count('@@JS@@') == 1, 'marcadores ausentes em src/app.html'
    return tpl.replace('@@CSS@@', css).replace('@@JS@@', js)

def build_dev():
    tpl = read(os.path.join(SRC, 'app.html'))
    tags = '\n'.join('<script src="js/%s"></script>' % os.path.basename(m) for m in modules())
    tpl = tpl.replace('<style>@@CSS@@</style>', '<link rel="stylesheet" href="css/app.css">')
    return tpl.replace('<script>@@JS@@</script>', '<!-- módulos (modo desenvolvimento) -->\n' + tags)

def main():
    out = build_single()
    target = os.path.join(ROOT, 'index.html')
    if '--check' in sys.argv:
        cur = read(target) if os.path.exists(target) else ''
        if cur != out:
            print('ERRO: index.html está desatualizado. Rode "python build.py" e envie o resultado.')
            sys.exit(1)
        print('OK: index.html corresponde aos módulos de src/ (%d módulos).' % len(modules()))
        return
    with open(target, 'w', encoding='utf8', newline='') as f:
        f.write(out)
    with open(os.path.join(SRC, 'dev.html'), 'w', encoding='utf8', newline='') as f:
        f.write(build_dev())
    print('index.html gerado (%d KB, %d módulos) e src/dev.html atualizado.' % (len(out.encode('utf8')) // 1024, len(modules())))

if __name__ == '__main__':
    main()
