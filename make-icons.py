from pathlib import Path
from PIL import Image, ImageDraw
import math
# Extend the app's existing circular-arrow mark into native install icons.
for size, name, maskable in [(192,'icon-192.png',False),(512,'icon-512.png',False),(512,'maskable-512.png',True)]:
    scale=4
    im=Image.new('RGBA',(size*scale,size*scale),'#d5ed9b')
    d=ImageDraw.Draw(im)
    c=size*scale/2
    radius=size*scale*(.23 if maskable else .28)
    width=int(size*scale*.065)
    d.arc([c-radius,c-radius,c+radius,c+radius],-42,273,fill='#19200f',width=width)
    # Clockwise arrow at the upper right.
    angle=math.radians(-42)
    x,y=c+radius*math.cos(angle),c+radius*math.sin(angle)
    wing=size*scale*.15
    d.line([(x-wing,y),(x,y),(x,y-wing)],fill='#19200f',width=width,joint='curve')
    im.resize((size,size),Image.Resampling.LANCZOS).save(Path('dist/icons')/name)
