        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getDatabase, ref, set, get, remove, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";



// --- AGREGAR ESTO: Importar Supabase ---
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

    // Configuración de Supabase (PEGA AQUÍ LO QUE COPIASTE EN EL PASO 4)
    const supabaseUrl = 'https://qeoojbsrqlroajvdgrju.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlb29qYnNycWxyb2FqdmRncmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5ODgyNDIsImV4cCI6MjA3OTU2NDI0Mn0.QJF-B4nLqyVuIY6y45Cc3UDtC-f_K-jdYtiNg8VmLos';
    
    // Iniciar Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Hacer accesible supabase globalmente (para usarlo en las funciones de abajo)
    window.supabase = supabase;




        window.firebaseModules = { initializeApp, getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, getDatabase, ref, set, get, remove, onValue, push, update };
   
   
    
 const firebaseConfig = {
  apiKey: "AIzaSyCO1IIYJ8T2ksWDnu_DisIZ0KXkhn2gh3w",
  authDomain: "data-client-3-2be69.firebaseapp.com",
  databaseURL: "https://data-client-3-2be69-default-rtdb.firebaseio.com",
  projectId: "data-client-3-2be69",
  storageBucket: "data-client-3-2be69.firebasestorage.app",
  messagingSenderId: "953517130591",
  appId: "1:953517130591:web:e31f9755daaa255c92ecea",
  measurementId: "G-Z1ZES6C86S"
};

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);

        let products = [];
        let categories = [];
        let orders = [];
        let usersData = {}; // <--- NUEVA VARIABLE PARA PUNTOS
        let currentPage = 1;
        const itemsPerPage = 10;
        
        // Variables para los buscadores
        let currentProductSearch = "";
        let currentOrderSearch = "";

        window.deleteBannerCard = async (btn) => {
            event.stopPropagation(); 
            const result = await Swal.fire({ title: '¿Eliminar Slide?', text: "Se eliminará de la base de datos inmediatamente.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
            if (result.isConfirmed) { btn.closest('.banner-card').remove(); await adminApp.saveBanners(true); Swal.fire({icon: 'success', title: 'Eliminado', toast: true, position: 'bottom-end', timer: 1000, showConfirmButton: false}); }
        };



// --- FUNCIONES NUEVAS PARA SUBIR IMAGEN EN PORTADA ---

window.handleBannerUpload = (fileInput, textInputId) => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const textInput = document.getElementById(textInputId);
            textInput.value = base64;
            // Actualizamos la vista previa manualmente
            window.updateBannerPreview(textInput);
        };
        reader.readAsDataURL(file);
    }
};

window.updateBannerPreview = (input) => {
    const card = input.closest('.banner-card');
    // Buscamos el contenedor de la imagen en el encabezado
    const container = card.querySelector('.banner-preview-wrapper');
    
    if (input.value && input.value.trim() !== "") {
        container.innerHTML = `<img src="${input.value}" class="w-full h-full object-cover">`;
    } else {
        container.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-bold ph-image"></i></div>`;
    }
};


window.addBannerCard = (data = {}) => {
    const container = document.getElementById('banners-list-container');
    
    // Generar IDs únicos
    const uniqueId = 'ban-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const inputId = `img-input-${uniqueId}`;
    
    // Lógica del botón (Switch)
    const hasButton = (data.btnText && data.btnText !== "") || (data.btnLink && data.btnLink !== "");
    const isChecked = hasButton ? 'checked' : '';
    const displayStyle = hasButton ? 'block' : 'none';

    // Opciones del select
    let selectOptions = `<option value="/shop" ${!data.btnLink || data.btnLink === '/shop' ? 'selected' : ''}>-- Ir a Tienda (General) --</option>`;
    if(categories.length > 0) { selectOptions += `<optgroup label="Categorías">`; categories.forEach(c => { const val = `/shop?category=${c.name}`; const isSel = data.btnLink === val ? 'selected' : ''; selectOptions += `<option value="${val}" ${isSel}>${c.name}</option>`; }); selectOptions += `</optgroup>`; }
    if(products.length > 0) { selectOptions += `<optgroup label="Productos">`; products.forEach(p => { const val = `?page=product&product=${p.slug}`; const isSel = data.btnLink === val ? 'selected' : ''; selectOptions += `<option value="${val}" ${isSel}>${p.name}</option>`; }); selectOptions += `</optgroup>`; }
    if(data.btnLink && !selectOptions.includes(data.btnLink)) selectOptions += `<option value="${data.btnLink}" selected>Link Personalizado: ${data.btnLink}</option>`;

    const div = document.createElement('div');
    div.className = "banner-card draggable-item bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all mb-4";
    div.setAttribute('draggable', 'true');
    
    div.innerHTML = `
        <div class="banner-row-header flex items-center justify-between p-4 bg-white cursor-move">
            <div class="flex items-center gap-4 w-full">
                <div class="text-slate-300 cursor-move hover:text-slate-600"><i class="ph-bold ph-dots-six-vertical text-xl"></i></div>
                
                <div class="banner-preview-wrapper w-16 h-10 bg-slate-100 rounded overflow-hidden flex-shrink-0 border border-slate-200 pointer-events-none">
                    ${data.image ? `<img src="${data.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-bold ph-image"></i></div>'}
                </div>
                
                <div class="flex-1 cursor-pointer" onclick="toggleBannerBody(this)">
                    <h4 class="font-bold text-sm text-slate-800 select-none">${data.title || 'Nueva Portada'}</h4>
                    <p class="text-xs text-slate-500 select-none">${data.subtitle || 'Click para editar'}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button type="button" onclick="deleteBannerCard(this)" class="text-slate-400 hover:text-red-500 p-2"><i class="ph-bold ph-trash"></i></button>
                <i class="ph-bold ph-caret-down text-slate-400 icon-caret transition-transform duration-200" onclick="toggleBannerBody(this.parentNode.previousElementSibling)"></i>
            </div>
        </div>
        
        <div class="banner-row-body p-6 space-y-4 border-t border-slate-100 bg-slate-50">
            
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Imagen de Fondo</label>
                <div class="flex gap-2">
                    <input type="file" id="file-${uniqueId}" class="hidden" accept="image/*" onchange="handleBannerUpload(this, '${inputId}')">
                    
                    <button type="button" onclick="document.getElementById('file-${uniqueId}').click()" class="bg-slate-900 text-white px-4 rounded-lg text-xs font-bold hover:bg-slate-800 transition whitespace-nowrap flex items-center gap-2">
                        <i class="ph-bold ph-upload-simple"></i> Subir Foto
                    </button>
                    
                    <input type="text" id="${inputId}" class="b-img flex-1 p-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm" value="${data.image || ''}" placeholder="O pega el link aquí..." oninput="updateBannerPreview(this)">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Etiqueta (Badge)</label><input type="text" class="b-badge w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm" value="${data.badge || ''}" placeholder="Ej: Nuevo 2025"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Subtítulo</label><input type="text" class="b-sub w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm" value="${data.subtitle || ''}" placeholder="Ej: Lo mejor en audio"></div>
            </div>
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Título Principal</label><input type="text" class="b-title w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm font-bold" value="${data.title || ''}" placeholder="Ej: Tecnología <br> Premium" oninput="this.closest('.banner-card').querySelector('h4').innerText = this.value || 'Nueva Portada'"></div>
            
            <div class="bg-white p-4 rounded-lg border border-slate-200">
                <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-slate-700 flex items-center gap-2"><i class="ph-bold ph-cursor-click"></i> Configuración del Botón</label>
                    <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" name="toggle" id="toggle-${uniqueId}" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 left-0 top-0 border-slate-300" ${isChecked} onchange="toggleButtonFields('${uniqueId}', this.checked)"/>
                        <label for="toggle-${uniqueId}" class="toggle-label block overflow-hidden h-5 rounded-full bg-slate-300 cursor-pointer transition-colors duration-300"></label>
                    </div>
                </div>
                
                <div id="btn-fields-${uniqueId}" class="grid grid-cols-2 gap-4 transition-all duration-300" style="display: ${displayStyle}">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">Texto Botón</label><input type="text" class="b-btn-text w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm" value="${data.btnText || ''}" placeholder="Ver Oferta"></div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">Acción del Botón</label><select class="b-btn-link w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-sm cursor-pointer hover:bg-slate-100">${selectOptions}</select></div>
                </div>
                <div id="btn-msg-${uniqueId}" class="text-xs text-slate-400 italic text-center py-2 ${hasButton ? 'hidden' : ''}">Botón deshabilitado (solo imagen)</div>
            </div>
        </div>`;

    div.addEventListener('dragstart', () => { div.classList.add('dragging'); });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); adminApp.saveBanners(true); });

    container.appendChild(div);
};

// --- FUNCIONES PARA IMÁGENES ---
    window.previewImage = (url, imgId) => {
        const img = document.getElementById(imgId);
        if(url && url.length > 10) { img.src = url; img.classList.remove('hidden'); } 
        else { img.classList.add('hidden'); }
    };




// --- 1. FUNCIÓN MÁGICA PARA COMPRIMIR IMÁGENES ---
// Esta función toma la foto gigante y la devuelve pequeña y ligera (WebP)
const compressImage = async (file, { quality = 0.7, maxWidth = 800 } = {}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // Crear un canvas para redimensionar
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo proporción
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a WebP (formato super ligero de Google)
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Error al comprimir imagen'));
                        return;
                    }
                    // Retornamos el archivo nuevo comprimido
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/webp', quality); // Calidad 0.7 (70%)
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- 2. TU FUNCIÓN DE SUBIDA MEJORADA ---
window.handleUpload = async (input, targetId) => {
    const originalFile = input.files[0];
    if (!originalFile) return;

    try {
        Swal.fire({
            title: 'Procesando y Subiendo...',
            text: 'Optimizando imagen para ahorrar espacio...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // PASO A: Comprimir la imagen antes de subir
        // Esto reduce una foto de 3MB a aprox 50KB-100KB
        const compressedFile = await compressImage(originalFile, { 
            quality: 0.7, // 70% calidad (casi imperceptible al ojo, ahorra mucho espacio)
            maxWidth: 800 // Ancho máximo de 800px (suficiente para web)
        });

        // PASO B: Preparar subida a Supabase
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
        
        // PASO C: Subir el archivo YA COMPRIMIDO
        const { data, error } = await window.supabase.storage
            .from('productos')
            .upload(fileName, compressedFile);

        if (error) throw error;

        // PASO D: Obtener URL
        const { data: publicUrlData } = window.supabase.storage
            .from('productos')
            .getPublicUrl(fileName);

        const finalUrl = publicUrlData.publicUrl;

        // PASO E: Mostrar en el admin
        document.getElementById(targetId).value = finalUrl;
        
        if(targetId === 'p-image') {
            previewImage(finalUrl, 'p-preview');
        } else {
            const row = document.getElementById(targetId).closest('.gallery-row');
            if(row) {
                row.querySelector('img').src = finalUrl;
                row.querySelector('img').classList.remove('hidden');
            }
        }

        Swal.close();
        
        // Mostrar cuánto espacio ahorraste (opcional, solo para que te sientas bien)
        const originalSize = (originalFile.size / 1024).toFixed(2);
        const newSize = (compressedFile.size / 1024).toFixed(2);
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'success', title: `Subida exitosa! Ahorro: ${originalSize}KB -> ${newSize}KB` });

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Fallo al procesar imagen: ' + error.message, 'error');
    }
};

    window.addGalleryItem = (value = '') => {
        const container = document.getElementById('gallery-container');
        const uniqueId = 'gal-' + Date.now() + Math.random().toString(36).substr(2, 9);
        const div = document.createElement('div');
        div.className = "gallery-row flex gap-2 items-start";
        div.innerHTML = `
            <div class="flex-1">
                <div class="flex gap-2">
                    <input type="text" value="${value}" class="gallery-input flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-xs" placeholder="URL Imagen" id="${uniqueId}" oninput="previewImage(this.value, 'img-${uniqueId}')">
                    <input type="file" id="file-${uniqueId}" class="hidden" accept="image/*" onchange="handleUpload(this, '${uniqueId}')">
                    <button type="button" onclick="document.getElementById('file-${uniqueId}').click()" class="bg-slate-100 hover:bg-slate-200 px-3 rounded-lg text-slate-600"><i class="ph-bold ph-upload-simple"></i></button>
                </div>
                <img id="img-${uniqueId}" src="${value}" class="${value ? '' : 'hidden'} h-16 w-16 object-cover mt-2 rounded border border-slate-200">
            </div>
            <button type="button" onclick="this.closest('.gallery-row').remove()" class="text-red-400 hover:text-red-600 p-2"><i class="ph-bold ph-trash"></i></button>
        `;
        container.appendChild(div);
    };


// AGREGAR ESTAS FUNCIONES NUEVAS:

// Toggle para abrir/cerrar el acordeón (separado para evitar conflictos con el drag)
window.toggleBannerBody = (el) => {
    const card = el.closest('.banner-card');
    card.classList.toggle('open');
};

// Toggle para mostrar/ocultar campos del botón
window.toggleButtonFields = (id, isChecked) => {
    const fields = document.getElementById(`btn-fields-${id}`);
    const msg = document.getElementById(`btn-msg-${id}`);
    
    if (isChecked) {
        fields.style.display = 'grid';
        msg.classList.add('hidden');
        // Restaurar valores por defecto si están vacíos
        const input = fields.querySelector('.b-btn-text');
        if(!input.value) input.value = "Ver Más";
    } else {
        fields.style.display = 'none';
        msg.classList.remove('hidden');
        // Limpiar valores para que no se guarden
        fields.querySelector('.b-btn-text').value = "";
        fields.querySelector('.b-btn-link').value = "";
    }
};

// Inicializar el contenedor de banners para aceptar Drag & Drop
// Esto debe ejecutarse una vez cargue el DOM
setTimeout(() => {
    const container = document.getElementById('banners-list-container');
    if(container) {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });
    }
}, 1000);

// Función matemática para calcular dónde soltar la tarjeta
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}



        window.adminApp = {
            switchTab: (tab) => {
                ['dashboard', 'products', 'categories', 'reviews', 'orders', 'clients', 'banner'].forEach(t => {
                    const el = document.getElementById(`view-${t}`);
                    const btn = document.getElementById(`tab-${t}`);
                    if (el) el.classList.toggle('hidden', t !== tab);
                    if (btn) {
                        if(t === tab) btn.className = "px-4 py-2 rounded-md text-sm font-bold bg-yellow-400 text-slate-900 transition flex items-center gap-2 relative";
                        else btn.className = "px-4 py-2 rounded-md text-sm font-bold text-slate-300 hover:text-white transition flex items-center gap-2 relative";
                    }
                });
                if(tab === 'dashboard') adminApp.renderDashboard();
                if(tab === 'products') adminApp.renderProducts(1);
                if(tab === 'orders') adminApp.renderOrdersTable();
                if(tab === 'clients') adminApp.renderClients();
            },
            logout: () => signOut(auth),
            
            handleProductSearch: (val) => { currentProductSearch = val.toLowerCase(); currentPage = 1; adminApp.renderProducts(1); },
            handleOrderSearch: (val) => { currentOrderSearch = val.toLowerCase(); adminApp.renderOrdersTable(); },

            saveBanners: async (silent = false) => {
                if(!silent) Swal.showLoading();
                const cards = document.querySelectorAll('.banner-card');

 // DENTRO DE adminApp.saveBanners, REEMPLAZA LA PARTE DEL "const bannersData = ..." POR:

const bannersData = Array.from(cards).map(card => {
    // Verificar si el bloque de botón está visible (si no, guardamos strings vacíos)
    const btnContainer = card.querySelector('[id^="btn-fields-"]');
    const isBtnActive = btnContainer && btnContainer.style.display !== 'none';

    return {
        image: card.querySelector('.b-img').value.trim(),
        badge: card.querySelector('.b-badge').value.trim(),
        subtitle: card.querySelector('.b-sub').value.trim(),
        title: card.querySelector('.b-title').value.trim(),
        // Solo guardamos datos de botón si el switch está activado
        btnText: isBtnActive ? card.querySelector('.b-btn-text').value.trim() : "",
        btnLink: isBtnActive ? card.querySelector('.b-btn-link').value.trim() : ""
    };
}).filter(b => b.image !== '');

                try { await set(ref(db, 'home_banner'), bannersData); if(!silent) Swal.fire('Portada Actualizada', 'Cambios guardados.', 'success'); } catch(e) { console.error(e); if(!silent) Swal.fire('Error', 'No se pudo guardar.', 'error'); }
            },

            

            renderDashboard: () => {
                const now = new Date();
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                document.getElementById('dash-month-label').innerText = `Ganancias - ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                const monthlyTotal = orders.filter(o => { const d = new Date(o.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.status === 'Aprobado'; }).reduce((sum, o) => sum + o.total, 0);
                document.getElementById('dash-earnings').innerText = `S/ ${monthlyTotal.toFixed(2)}`;
                const lowStock = products.filter(p => (p.stock || 0) < 5);
                const lsBody = document.getElementById('dash-low-stock-body');
                if(lowStock.length > 0) {
                    document.getElementById('dash-no-low-stock').classList.add('hidden');
                    lsBody.innerHTML = lowStock.map(p => `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td class="p-3 font-medium text-slate-800">${p.name}</td><td class="p-3 font-bold text-red-600">${p.stock}</td><td class="p-3 text-right"><button onclick="adminApp.openProductModal('${p.id}')" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">Editar Stock</button></td></tr>`).join('');
                } else { lsBody.innerHTML = ''; document.getElementById('dash-no-low-stock').classList.remove('hidden'); }
            },

            // --- FUNCIÓN ADAPTADA: CLIENTES CON PUNTOS ---
            renderClients: () => {
                const clientMap = new Map();
                orders.forEach(o => {
                    const key = o.userId; 
                    if(!clientMap.has(key)) { 
                        const realUser = usersData[key] || {}; // Buscamos los datos reales (puntos/wallet)
                        clientMap.set(key, { 
                            id: key, 
                            name: o.billing.name, 
                            phone: o.billing.phone, 
                            dni: o.billing.dni, 
                            totalSpent: 0, 
                            lastOrder: o.date, 
                            orderCount: 0,
                            points: realUser.points || 0, // <--- PUNTOS
                            wallet: realUser.wallet || 0  // <--- MONEDERO
                        }); 
                    }
                    const client = clientMap.get(key); 
                    if(o.status === 'Aprobado') client.totalSpent += o.total; 
                    client.orderCount += 1;
                    if(new Date(o.date) > new Date(client.lastOrder)) client.lastOrder = o.date;
                });

                const tbody = document.getElementById('clients-table-body');
                const empty = document.getElementById('empty-clients');
                
                if(clientMap.size === 0) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
                empty.classList.add('hidden');
                
                tbody.innerHTML = Array.from(clientMap.values()).map(c => `
                    <tr class="hover:bg-slate-50 border-b border-slate-100">
                        <td class="p-4">
                            <div class="font-bold text-slate-900">${c.name}</div>
                            <div class="flex gap-2 mt-1">
                                <span class="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 flex items-center gap-1"><i class="ph-fill ph-star"></i> ${c.points} Pts</span>
                                <span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 flex items-center gap-1"><i class="ph-fill ph-wallet"></i> S/ ${c.wallet.toFixed(2)}</span>
                            </div>
                            <div class="text-xs text-slate-400 font-normal mt-0.5">${c.orderCount} pedidos totales</div>
                        </td>
                        <td class="p-4 text-sm">${c.dni} <br> <span class="text-blue-600 font-bold"><i class="ph-bold ph-whatsapp"></i> ${c.phone}</span></td>
                        <td class="p-4 font-bold text-green-700">S/ ${c.totalSpent.toFixed(2)}</td>
                        <td class="p-4 text-xs text-slate-500">${new Date(c.lastOrder).toLocaleDateString()}</td>
                        <td class="p-4 text-right"><button onclick="adminApp.showClientDetails('${c.id}')" class="text-slate-500 hover:text-blue-600 font-bold text-xs flex items-center justify-end gap-1 ml-auto"><i class="ph-bold ph-eye"></i> Ver Historial</button></td>
                    </tr>`).join('');
            },

showClientDetails: (userId) => {
                const userOrders = orders.filter(o => o.userId === userId).sort((a,b) => new Date(b.date) - new Date(a.date));
                const container = document.getElementById('client-history-content');
                if(userOrders.length === 0) container.innerHTML = '<p class="text-center text-slate-400">Sin historial disponible.</p>';
                else {
                    container.innerHTML = userOrders.map(o => {
                        const itemsHTML = o.items.map(i => `<div class="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0"><span class="text-slate-600">${i.qty}x ${i.name}</span><span class="font-bold text-slate-800">S/ ${(i.price*i.qty).toFixed(2)}</span></div>`).join('');
                        let statusColor = o.status === 'Aprobado' ? 'text-green-600' : (o.status === 'Pendiente de Validación' ? 'text-yellow-600' : 'text-red-500');
                        
                        // AGREGADO: Detectar si usó monedero
                        let walletInfo = '';
                        if (o.walletUsed && o.walletUsed > 0) {
                            walletInfo = `<div class="flex justify-between text-xs font-bold text-green-600 border-t border-slate-100 pt-2 mt-2"><span>Saldo Monedero:</span><span>- S/ ${o.walletUsed.toFixed(2)}</span></div>`;
                        }

                        return `
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-sm text-slate-900">Pedido #${o.id.slice(-6)}</span>
                                <span class="text-xs font-bold ${statusColor}">${o.status}</span>
                            </div>
                            <div class="text-xs text-slate-400 mb-3">${new Date(o.date).toLocaleDateString()} - ${new Date(o.date).toLocaleTimeString()}</div>
                            <div class="bg-white p-3 rounded-lg border border-slate-100 mb-3 space-y-1">
                                ${itemsHTML}
                                ${walletInfo} </div>
                            <div class="text-right font-bold text-slate-900 text-sm">Total Pagado: S/ ${o.total.toFixed(2)}</div>
                        </div>`;
                    }).join('');
                }
                const modal = document.getElementById('client-modal');
                const panel = document.getElementById('client-panel');
                modal.classList.remove('hidden');
                setTimeout(() => panel.classList.remove('translate-x-full'), 10);
            },

            renderProducts: (page) => {
                currentPage = page;
                let filtered = products;
                if(currentProductSearch) filtered = products.filter(p => p.name.toLowerCase().includes(currentProductSearch) || p.category.toLowerCase().includes(currentProductSearch));
                
                const start = (page - 1) * itemsPerPage;
                const paginatedItems = filtered.slice(start, start + itemsPerPage);
                const tbody = document.getElementById('products-table-body');
                const empty = document.getElementById('empty-products');
                
                if(filtered.length === 0) { tbody.innerHTML = ''; empty.classList.remove('hidden'); }
                else {
                    empty.classList.add('hidden');
                    tbody.innerHTML = paginatedItems.map(p => `
                        <tr class="hover:bg-slate-50 border-b border-slate-100">
                            <td class="p-4 font-medium flex items-center gap-3">
                                <img src="${p.image}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0">
                                <div>
                                    <div class="line-clamp-1">${p.name}</div>
                                    ${p.isOffer ? '<span class="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">OFERTA</span>' : ''}
                                </div>
                            </td>
                            <td class="p-4 text-slate-500"><span class="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">${p.category}</span></td>
                            <td class="p-4 text-slate-700 text-sm font-bold ${p.stock < 5 ? 'text-red-600' : ''}">${p.stock !== undefined ? p.stock : 0} unid.</td>
                            <td class="p-4 font-bold text-sm">${p.isOffer && p.offerPrice ? `<span class="text-slate-400 line-through text-xs mr-1">S/ ${p.price}</span> <span class="text-red-600">S/ ${p.offerPrice}</span>` : `S/ ${p.price}`}</td>
                            <td class="p-4 text-right"><button onclick="adminApp.openProductModal('${p.id}')" class="text-blue-600 p-2"><i class="ph-bold ph-pencil-simple"></i></button><button onclick="adminApp.deleteItem('products', '${p.id}')" class="text-red-500 p-2"><i class="ph-bold ph-trash"></i></button></td>
                        </tr>`).join('');
                }

                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const controls = document.getElementById('pagination-controls');
                if(totalPages > 1) {
                    controls.innerHTML = `
                        <button onclick="adminApp.renderProducts(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50 text-sm">Anterior</button>
                        <span class="text-sm font-bold text-slate-600">Página ${currentPage} de ${totalPages}</span>
                        <button onclick="adminApp.renderProducts(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50 text-sm">Siguiente</button>
                    `;
                } else controls.innerHTML = '';
            },

            renderOrdersTable: () => {
                let filtered = orders;
                if(currentOrderSearch) {
                    filtered = orders.filter(o => 
                        o.id.includes(currentOrderSearch) || 
                        o.billing.name.toLowerCase().includes(currentOrderSearch) || 
                        o.billing.dni.includes(currentOrderSearch)
                    );
                }

                const tbody = document.getElementById('orders-table-body');
                const empty = document.getElementById('empty-orders');
                
                if(filtered.length === 0) { tbody.innerHTML = ''; empty.classList.remove('hidden'); }
                else {
                    empty.classList.add('hidden');
                    tbody.innerHTML = filtered.map(o => {
                        let badgeColor = o.status === 'Aprobado' ? "bg-green-100 text-green-700" : (o.status.includes('Expirado') || o.status === 'Rechazado' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700");
                        let timerHTML = "";
                        if(o.status === 'Pendiente de Validación' && o.expireAt) timerHTML = `<div class="text-xs font-bold mt-1"><i class="ph-bold ph-clock"></i> <span class="admin-order-timer" data-id="${o.id}" data-expire="${o.expireAt}">Calculando...</span></div>`;
                        return `
                        <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
                            <td class="p-4 align-top"><div class="font-bold text-slate-900">#${o.id ? o.id.slice(-6) : '---'}</div><div class="text-xs text-slate-500">${new Date(o.date).toLocaleDateString()} <br> ${new Date(o.date).toLocaleTimeString()}</div>${timerHTML}</td>
                            <td class="p-4 align-top"><div class="font-bold text-sm">${o.billing.name}</div><div class="text-xs text-slate-500">DNI: ${o.billing.dni}</div><div class="text-xs text-blue-600"><i class="ph-bold ph-whatsapp"></i> ${o.billing.phone}</div></td>
                            <td class="p-4 align-top"><div class="font-bold text-slate-900">S/ ${o.total.toFixed(2)}</div><div class="mt-1">${o.payment.method === 'WhatsApp/Otro' || o.payment.securityCode === 'N/A' ? '<span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 font-bold"><i class="ph-bold ph-whatsapp"></i> WhatsApp/Otro</span>' : `<div class="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200">Código: <b>${o.payment.securityCode}</b></div>`}</div></td>
                            <td class="p-4 align-top"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}">${o.status}</span></td>
                           
                           <td class="p-4 text-right align-top space-x-1 whitespace-nowrap">
    ${o.status === 'Pendiente de Validación' ? 
        `<button onclick="adminApp.updateOrderStatus('${o.id}', '${o.userId}', 'Aprobado')" title="Aprobar" class="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 shadow-sm"><i class="ph-bold ph-check"></i></button>
         <button onclick="adminApp.updateOrderStatus('${o.id}', '${o.userId}', 'Rechazado')" title="Rechazar" class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 shadow-sm"><i class="ph-bold ph-x"></i></button>` 
    : (o.status.includes('Expirado') ? 
        `<button onclick="adminApp.updateOrderStatus('${o.id}', '${o.userId}', 'Aprobado')" title="Recuperar Venta Expirada" class="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-sm"><i class="ph-bold ph-arrow-u-up-left"></i> Recuperar</button>` 
        : '<span class="text-slate-300 text-xs italic mr-2">Cerrado</span>')
    }
    <button onclick="adminApp.deleteOrder('${o.id}', '${o.userId}')" title="Eliminar Registro" class="bg-white text-red-500 border border-red-200 p-2 rounded-lg hover:bg-red-50 shadow-sm"><i class="ph-bold ph-trash"></i></button>
</td>
                      
                        </tr>`;
                    }).join('');
                }
            },

            openProductModal: (id = null) => {
                const modal = document.getElementById('product-modal');
                const panel = document.getElementById('product-panel');
                document.getElementById('product-form').reset();
                document.getElementById('p-preview').classList.add('hidden');
                const select = document.getElementById('p-category');
                select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
               
                
               
                if(id) {
                    const p = products.find(x => x.id === id);
                    if(p) {
                        document.getElementById('p-modal-title').innerText = "Editar Producto";
                        document.getElementById('p-id').value = p.id; document.getElementById('p-name').value = p.name; document.getElementById('p-price').value = p.price;
                        
                        document.getElementById('p-points').value = p.points || 0; // <--- AGREGAR ESTA LÍNEA
                        
                        document.getElementById('p-category').value = p.category; document.getElementById('p-slug').value = p.slug; 
                        
                        document.getElementById('p-image').value = p.image; 
                        document.getElementById('p-video-url').value = p.videoUrl || '';
document.getElementById('p-has-video').checked = p.hasVideo || false;
                        
                      // LIMPIAR GALERÍA PRIMERO
document.getElementById('gallery-container').innerHTML = '';

// SI HAY ID (EDITAR)
if(p) {
   // ... (tus otros campos p-name, p-price, etc dejálos igual) ...
   document.getElementById('p-image').value = p.image;
   previewImage(p.image, 'p-preview'); // Mostrar preview principal

   // CARGAR GALERÍA EXISTENTE
   if(p.gallery && Array.isArray(p.gallery)){
       p.gallery.forEach(imgUrl => addGalleryItem(imgUrl));
   }
} 
// SI ES NUEVO
else {
    // ... (tus otros campos de reset) ...
    document.getElementById('p-preview').classList.add('hidden');
    // Agregar un campo vacío por defecto
    addGalleryItem(); 
}
                        
                        
                        
                        document.getElementById('p-desc').value = p.description; document.getElementById('p-specs').value = p.specifications || ''; document.getElementById('p-stock').value = p.stock || 0; document.getElementById('p-offer').checked = p.isOffer || false;



                        const offerInput = document.getElementById('p-offer-price'); offerInput.value = p.offerPrice || ''; offerInput.disabled = !p.isOffer; const img = document.getElementById('p-preview'); img.src = p.image; img.classList.remove('hidden');
                    }
                } else { document.getElementById('p-modal-title').innerText = "Crear Producto"; 
                document.getElementById('p-id').value = ""; 
                document.getElementById('p-video-url').value = "";
document.getElementById('p-has-video').checked = false;
                document.getElementById('p-points').value = ""; // <--- AGREGAR ESTA LÍNEA
                
                document.getElementById('p-stock').value = 0; document.getElementById('p-offer').checked = false; document.getElementById('p-offer-price').value = ""; document.getElementById('p-offer-price').disabled = true; }
                modal.classList.remove('hidden'); setTimeout(() => panel.classList.remove('translate-x-full'), 10);
            },
            

            openCategoryModal: (id = null) => {
                const modal = document.getElementById('category-modal');
                const panel = document.getElementById('category-panel');
                document.getElementById('category-form').reset();
                if(id) { const c = categories.find(x => x.id === id); document.getElementById('c-modal-title').innerText = "Editar Categoría"; document.getElementById('c-id').value = c.id; document.getElementById('c-name').value = c.name; document.getElementById('c-slug').value = c.slug; } 
                else { document.getElementById('c-modal-title').innerText = "Nueva Categoría"; document.getElementById('c-id').value = ""; }
                modal.classList.remove('hidden'); setTimeout(() => panel.classList.remove('translate-x-full'), 10);
            },

            closeModal: (type) => {
                const modal = document.getElementById(`${type}-modal`);
                const panel = document.getElementById(`${type}-panel`);
                panel.classList.add('translate-x-full');
                setTimeout(() => modal.classList.add('hidden'), 300);
            },

            deleteItem: async (type, id) => { if((await Swal.fire({title: '¿Eliminar?', icon: 'warning', showCancelButton: true})).isConfirmed) { await remove(ref(db, `${type}/${id}`)); Swal.fire('Eliminado', '', 'success'); } },
            deleteReview: async (productId, reviewId) => { if((await Swal.fire({title: '¿Borrar comentario?', text: "Se recalculará el promedio del producto.", icon: 'warning', showCancelButton: true})).isConfirmed) { try { Swal.showLoading(); await remove(ref(db, `reviews/${productId}/${reviewId}`)); const snap = await get(ref(db, `reviews/${productId}`)); let rating = 0, count = 0; if(snap.exists()) { const revs = Object.values(snap.val()); count = revs.length; rating = revs.reduce((a,b) => a + b.rating, 0) / count; } await update(ref(db, `products/${productId}`), { rating: rating, reviewCount: count }); Swal.fire('Comentario Eliminado', '', 'success'); } catch(e) { console.error(e); Swal.fire('Error', e.message, 'error'); } } },



updateOrderStatus: async (orderId, userId, newStatus) => {
                try { 
                    const order = orders.find(o => o.id === orderId);
                    if (!order) return;

                    const updates = {}; 
                    
                    // --- LÓGICA DE RECUPERACIÓN DE STOCK (NUEVO) ---
                    // Si estamos APROBANDO un pedido que estaba EXPIRADO, debemos volver a restar el stock
                    // porque el sistema lo devolvió cuando el tiempo se agotó.
                    if (newStatus === 'Aprobado' && order.status.includes('Expirado')) {
                        let stockIssue = false;
                        
                        // Verificamos y preparamos la resta de stock
                        if(order.items && Array.isArray(order.items)) {
                            order.items.forEach(item => {
                                const prod = products.find(p => p.id === item.id);
                                if(prod) {
                                    const currentStock = prod.stock || 0;
                                    // Opcional: Validar si hay stock suficiente ahora mismo
                                    if(currentStock < item.qty) {
                                        stockIssue = true;
                                        console.warn(`Stock insuficiente para recuperar ${item.name}`);
                                    }
                                    updates[`products/${item.id}/stock`] = currentStock - item.qty;
                                }
                            });
                        }

                        if(stockIssue) {
                            const confirm = await Swal.fire({
                                title: 'Stock Insuficiente',
                                text: 'Algunos productos ya no tienen stock físico. ¿Quieres forzar la aprobación y dejar el stock en negativo?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Sí, forzar venta',
                                cancelButtonText: 'Cancelar'
                            });
                            if(!confirm.isConfirmed) return;
                        }
                    }
                    // -----------------------------------------------

                    updates[`all_orders/${orderId}/status`] = newStatus; 
                    updates[`users/${userId}/orders/${orderId}/status`] = newStatus; 

                    if (newStatus === 'Aprobado') {
                        if (order && !order.pointsAwarded) {
                            // --- LÓGICA DE PUNTOS ---
                            let pointsEarned = 0;
                            if (order.items && Array.isArray(order.items)) {
                                pointsEarned = order.items.reduce((acc, item) => {
                                    const itemPoints = item.points ? parseInt(item.points) : 0;
                                    return acc + (itemPoints * item.qty);
                                }, 0);
                            }
                            
                            if (pointsEarned === 0 && order.total > 0) pointsEarned = Math.floor(order.total);

                            const currentUserData = usersData[userId] || {};
                            const currentPoints = currentUserData.points || 0;
                            const newPoints = currentPoints + pointsEarned;

                            updates[`users/${userId}/points`] = newPoints;
                            updates[`all_orders/${orderId}/pointsAwarded`] = true;
                            updates[`users/${userId}/orders/${orderId}/pointsAwarded`] = true;

                            Swal.fire({ icon: 'success', title: `¡Recuperado + ${pointsEarned} Pts!`, text: 'Pedido validado y stock actualizado.', toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false });
                        } else {
                            Swal.fire({ icon: 'success', title: 'Pedido Aprobado', text: 'Estado actualizado correctamente.', toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false });
                        }
                    }
                    else {
                        const color = newStatus === 'Aprobado' ? 'success' : 'error'; 
                        Swal.fire({ icon: color, title: `Pedido ${newStatus}`, toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false });
                    }

                    await update(ref(db), updates);
                } catch (e) { console.error(e); Swal.fire('Error', 'No se pudo actualizar: ' + e.message, 'error'); }
            },


            deleteOrder: async (orderId, userId) => { if((await Swal.fire({title: '¿Eliminar Pedido?', text: "Esta acción borrará el registro permanentemente.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'})).isConfirmed) { try { const updates = {}; updates[`all_orders/${orderId}`] = null; updates[`users/${userId}/orders/${orderId}`] = null; await update(ref(db), updates); Swal.fire('Pedido Eliminado', '', 'success'); } catch(e) { console.error(e); Swal.fire('Error', e.message, 'error'); } } }
        };

        document.getElementById('login-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); } catch (e) { Swal.fire('Error', 'Acceso denegado', 'error'); } });
        document.getElementById('product-form').addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            Swal.showLoading(); 
            const id = document.getElementById('p-id').value; 
            const isOffer = document.getElementById('p-offer').checked; 
            const data = { 
                name: document.getElementById('p-name').value, 
                price: parseFloat(document.getElementById('p-price').value), 
                points: parseInt(document.getElementById('p-points').value) || 0, // <--- AGREGAR ESTO
                category: document.getElementById('p-category').value, 
                videoUrl: document.getElementById('p-video-url').value,
hasVideo: document.getElementById('p-has-video').checked,
                points: parseInt(document.getElementById('p-points').value) || 0, // <--- AGREGAR ESTA LÍNEA
                slug: document.getElementById('p-slug').value || document.getElementById('p-name').value.toLowerCase().replace(/ /g, '-'), 
                image: document.getElementById('p-image').value, 
          gallery: Array.from(document.querySelectorAll('.gallery-input')).map(input => input.value).filter(x => x.trim() !== ''),
                description: document.getElementById('p-desc').value, 
                specifications: document.getElementById('p-specs').value, 
                stock: parseInt(document.getElementById('p-stock').value) || 0, 
                isOffer: isOffer, 
                offerPrice: isOffer ? parseFloat(document.getElementById('p-offer-price').value) : null 
            }; 

            try { 
                if(id) {
                    await update(ref(db, `products/${id}`), data); 
                } else { 
                    const r = push(ref(db, 'products')); 
                    await set(r, {
                        ...data, 
                        id: r.key, 
                        date: new Date().toISOString()
                    }); 
                } 
                adminApp.closeModal('product'); 
                Swal.close(); 
            } catch(e) { Swal.fire('Error', e.message, 'error'); } 
        });
        
        document.getElementById('category-form').addEventListener('submit', async (e) => { e.preventDefault(); Swal.showLoading(); const id = document.getElementById('c-id').value; const name = document.getElementById('c-name').value; const data = { name: name, slug: document.getElementById('c-slug').value || name.toLowerCase().replace(/ /g, '-') }; try { if(id) await update(ref(db, `categories/${id}`), data); else { const r = push(ref(db, 'categories')); await set(r, {...data, id: r.key}); } adminApp.closeModal('category'); Swal.close(); } catch(e) { Swal.fire('Error', e.message, 'error'); } });
        document.getElementById('p-image').addEventListener('input', e => { const i = document.getElementById('p-preview'); if(e.target.value){ i.src=e.target.value; i.classList.remove('hidden'); } else i.classList.add('hidden'); });

        onAuthStateChanged(auth, (user) => {
            if(user) {
                document.getElementById('login-view').classList.add('hidden'); document.getElementById('dashboard-view').classList.remove('hidden'); adminApp.switchTab('dashboard');
                onValue(ref(db, 'home_banner'), (snapshot) => { const container = document.getElementById('banners-list-container'); container.innerHTML = ''; if(snapshot.exists()) { const data = snapshot.val(); let bannerList = Array.isArray(data) ? data : (data.image ? [data] : []); bannerList.forEach(item => addBannerCard(item)); } else { addBannerCard(); } });
                onValue(ref(db, 'products'), s => { if(s.exists()) products = Object.values(s.val()); else products = []; if(!document.getElementById('view-products').classList.contains('hidden')) adminApp.renderProducts(currentPage); if(!document.getElementById('view-dashboard').classList.contains('hidden')) adminApp.renderDashboard(); });
                onValue(ref(db, 'categories'), s => { const tbody = document.getElementById('categories-table-body'); if(!s.exists()) { tbody.innerHTML = ''; document.getElementById('empty-categories').classList.remove('hidden'); return; } document.getElementById('empty-categories').classList.add('hidden'); categories = Object.values(s.val()); tbody.innerHTML = categories.map(c => `<tr class="hover:bg-slate-50 border-b border-slate-100"><td class="p-4 font-bold">${c.name}</td><td class="p-4 text-slate-500 italic text-xs">${c.slug}</td><td class="p-4 text-right"><button onclick="adminApp.openCategoryModal('${c.id}')" class="text-blue-600 p-2"><i class="ph-bold ph-pencil-simple"></i></button><button onclick="adminApp.deleteItem('categories', '${c.id}')" class="text-red-500 p-2"><i class="ph-bold ph-trash"></i></button></td></tr>`).join(''); });
                
                // --- NUEVO: ESCUCHAR USUARIOS PARA OBTENER PUNTOS ---
                onValue(ref(db, 'users'), (snapshot) => {
                    if (snapshot.exists()) {
                        usersData = snapshot.val();
                        // Si estamos en la vista de clientes, repintar para mostrar puntos actualizados
                        if (!document.getElementById('view-clients').classList.contains('hidden')) {
                            adminApp.renderClients();
                        }
                    }
                });

                onValue(ref(db, 'reviews'), s => { const container = document.getElementById('reviews-list'); const empty = document.getElementById('empty-reviews'); if(!s.exists()) { container.innerHTML = ''; empty.classList.remove('hidden'); return; } empty.classList.add('hidden'); const allReviews = s.val(); container.innerHTML = Object.keys(allReviews).map(productId => { const productReviews = allReviews[productId]; const prodData = products.find(p => p.id === productId); const prodName = prodData ? prodData.name : 'Producto Eliminado o ID: ' + productId; const prodImg = prodData ? prodData.image : ''; const reviewsArray = Object.entries(productReviews); return `<details class="bg-white rounded-xl border border-slate-200 overflow-hidden group open:shadow-md transition-all duration-300"><summary class="flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition list-none"><div class="flex items-center gap-3">${prodImg ? `<img src="${prodImg}" class="w-10 h-10 object-cover rounded-md border border-slate-200">` : '<div class="w-10 h-10 bg-slate-200 rounded-md"></div>'}<div><h3 class="font-bold text-slate-900 text-sm">${prodName}</h3><span class="text-xs text-slate-500">${reviewsArray.length} comentario(s)</span></div></div><i class="ph-bold ph-caret-down text-slate-400 group-open:rotate-180 transition-transform"></i></summary><div class="p-4 border-t border-slate-100 bg-white space-y-3">${reviewsArray.map(([revId, r]) => `<div class="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"><div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">${r.userName ? r.userName.charAt(0).toUpperCase() : '?'}</div><div class="flex-1"><div class="flex justify-between items-start mb-1"><span class="font-bold text-xs text-slate-900">${r.userName}</span><span class="text-[10px] text-slate-400">${new Date(r.date).toLocaleDateString()}</span></div><div class="flex text-yellow-400 text-[10px] mb-1">${Array(5).fill(0).map((_,i) => i < r.rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph-bold ph-star text-slate-300"></i>').join('')}</div><p class="text-xs text-slate-600 italic">"${r.comment}"</p></div><button onclick="adminApp.deleteReview('${productId}', '${revId}')" class="self-start p-2 text-slate-400 hover:text-red-500 transition"><i class="ph-bold ph-trash"></i></button></div>`).join('')}</div></details>`; }).join(''); });

                onValue(ref(db, 'all_orders'), async (s) => {
                    if(!s.exists()) { orders = []; document.getElementById('orders-table-body').innerHTML = ''; document.getElementById('empty-orders').classList.remove('hidden'); } 
                    else {
                        orders = Object.values(s.val()).sort((a,b) => new Date(b.date) - new Date(a.date));
                        const pendingCount = orders.filter(o => o.status === 'Pendiente de Validación').length;
                        const badge = document.getElementById('order-alert-badge');
                        if(pendingCount > 0) { badge.innerText = pendingCount; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
                        
                        if(!document.getElementById('view-dashboard').classList.contains('hidden')) adminApp.renderDashboard();
                        if(!document.getElementById('view-clients').classList.contains('hidden')) adminApp.renderClients();
                        if(!document.getElementById('view-orders').classList.contains('hidden')) adminApp.renderOrdersTable();

                        const now = Date.now(); let hasUpdates = false; const updates = {};
                        orders.forEach(o => {
                            if(o.status === 'Pendiente de Validación' && o.expireAt && now > o.expireAt) {
                                updates[`all_orders/${o.id}/status`] = 'Expirado (Tiempo Agotado)'; updates[`users/${o.userId}/orders/${o.id}/status`] = 'Expirado (Tiempo Agotado)';
                                if(o.items && Array.isArray(o.items)) { o.items.forEach(item => { const currentProd = products.find(p => p.id === item.id); if(currentProd) updates[`products/${item.id}/stock`] = (currentProd.stock || 0) + item.qty; }); }
                                hasUpdates = true; o.status = 'Expirado (Tiempo Agotado)'; 
                            }
                        });
                        if(hasUpdates) { try { await update(ref(db), updates); } catch(e) { console.error("Error revirtiendo stock", e); } }

                        if(window.adminTimerInterval) clearInterval(window.adminTimerInterval);
                        window.adminTimerInterval = setInterval(() => {
                            const timers = document.querySelectorAll('.admin-order-timer');
                            if(timers.length === 0) return;
                            timers.forEach(async el => {
                                const expire = parseInt(el.dataset.expire); const orderId = el.dataset.id; const diff = expire - Date.now();
                                if(diff <= 0) { if(el.dataset.processing === "true") return; el.dataset.processing = "true"; el.innerHTML = "<span class='text-red-500'>Expirando...</span>"; const currentOrder = orders.find(o => o.id === orderId); if(currentOrder && currentOrder.status === 'Pendiente de Validación') { const autoUpdates = {}; autoUpdates[`all_orders/${orderId}/status`] = 'Expirado (Tiempo Agotado)'; autoUpdates[`users/${currentOrder.userId}/orders/${orderId}/status`] = 'Expirado (Tiempo Agotado)'; if(currentOrder.items && Array.isArray(currentOrder.items)) { currentOrder.items.forEach(item => { const prod = products.find(p => p.id === item.id); if(prod) autoUpdates[`products/${item.id}/stock`] = (prod.stock || 0) + item.qty; }); } try { await update(ref(db), autoUpdates); } catch(e) { console.error("Error auto-expirando", e); } } } 
                                else { const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000); el.innerText = `${m}:${s < 10 ? '0' : ''}${s} min restantes`; el.className = "admin-order-timer text-orange-600"; }
                            });
                        }, 1000);
                    }
                });
            } else { document.getElementById('login-view').classList.remove('hidden'); document.getElementById('dashboard-view').classList.add('hidden'); }
        });
