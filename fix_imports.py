import sys
import re

def fix_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/components/Cartridge.tsx', [
    ("import { Download, Trash2, Upload, Database, ChevronRight, HardDrive, Dna, Bot, Zap, Play, Plus, X } from 'lucide-react';", "import { Download, Trash2, ChevronRight, HardDrive, Dna, Bot, Zap, Play, Plus, X } from 'lucide-react';")
])

fix_file('src/components/Documentation.tsx', [
    ("import { BookOpen, HelpCircle, Sparkles, Sliders, Save, Keyboard, Upload, Cpu, Activity, Ghost } from 'lucide-react';", "import { BookOpen, HelpCircle, Sparkles, Sliders, Save, Cpu } from 'lucide-react';")
])

fix_file('src/components/EnvelopeDiagram.tsx', [
    ("const sw4 = 1 - Math.max(0, Math.min(1, op.r4 / 99));", "")
])
