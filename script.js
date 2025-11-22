import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCjiOBH2TvmuTq5qCP6JTv0GH6XI_N9s4Y",
    authDomain: "netflix-panel-v1.firebaseapp.com",
    databaseURL: "https://netflix-panel-v1-default-rtdb.firebaseio.com",
    projectId: "netflix-panel-v1",
    storageBucket: "netflix-panel-v1.firebasestorage.app",
    messagingSenderId: "581170714950",
    appId: "1:581170714950:web:75d28c7ebcef1ab3d46d47"
};

let app;
try { app = initializeApp(firebaseConfig); } catch(e){ app = firebase.app(); }
const auth = getAuth(app);
const db = getDatabase(app);

let PRODUCTS = []; 
let CATEGORIES = [];
let BANNER_DATA = null;
let bannerInterval = null;

onValue(ref(db, 'products'), (snapshot) => {
    if (snapshot.exists()) {
        PRODUCTS = Object.values(snapshot.val());
        router.handle();
    } else { PRODUCTS = []; router.handle(); }
});

onValue(ref(db, 'categories'), (snapshot) => {
    if (snapshot.exists()) {
        CATEGORIES = Object.values(snapshot.val());
        router.handle();
    } else { CATEGORIES = []; router.handle(); }
});

onValue(ref(db, 'home_banner'), (snapshot) => {
    if (snapshot.exists()) {
        BANNER_DATA = snapshot.val();
        const params = new URLSearchParams(window.location.search);
        const currentPage = params.get('page') || 'home';
        if(currentPage === 'home') {
            const app = document.getElementById('app');
            renderHome(app);
        }
    }
});

const FAQS = [
    { q: "¿Realizan envíos a provincias?", a: "Sí, realizamos envíos a todo el Perú a través de Olva Courier y Shalom. El tiempo estimado es de 2 a 4 días hábiles." },
    { q: "¿Los productos tienen garantía?", a: "Todos nuestros productos cuentan con 12 meses de garantía oficial de marca por defectos de fábrica." },
    { q: "¿Tienen tienda física?", a: "Actualmente somos una tienda 100% online para ofrecerte los mejores precios, pero contamos con almacén en Lima para retiros." },
    { q: "¿Qué medios de pago aceptan?", a: "Aceptamos todas las tarjetas de crédito/débito, Yape, Plin y Transferencia Bancaria." }
];

const state = { 
    cart: JSON.parse(localStorage.getItem('techsaul_cart')) || [], 
    user: null,
    favorites: new Set(), 
    orders: [] 
};

window.uiManager = {
    toggleMobileMenu: () => {
        const menu = document.getElementById('mobile-menu');
        const panel = document.getElementById('mobile-menu-panel');
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            setTimeout(() => panel.classList.remove('-translate-x-full'), 10);
        } else {
            panel.classList.add('-translate-x-full');
            setTimeout(() => menu.classList.add('hidden'), 300);
        }
    },
    mobileNavigate: (path, params) => {
        uiManager.toggleMobileMenu();
        router.navigate(path, params);
    }
};

window.userActions = {
    handleProfileClick: () => {
        if (state.user) router.navigate('/profile');
        else router.navigate('/login');
    },
    toggleFavorite: async (productId) => {
        if (!state.user) return Swal.fire('Inicia sesión', 'Debes ingresar para guardar favoritos', 'info');
        const dbRef = ref(db, `users/${state.user.uid}/favorites/${productId}`);
        if (state.favorites.has(productId)) {
            await remove(dbRef);
            Swal.fire({icon: 'success', title: 'Eliminado de favoritos', toast: true, position: 'bottom-end', timer: 1000, showConfirmButton: false});
        } else {
            await set(dbRef, true);
            Swal.fire({icon: 'success', title: 'Añadido a favoritos', toast: true, position: 'bottom-end', timer: 1000, showConfirmButton: false});
        }
    },
    checkout: () => {
        if (state.cart.length === 0) return Swal.fire('Carrito Vacío', 'Agrega productos antes de pagar.', 'warning');
        if (!state.user) {
            cartManager.toggleCart();
            Swal.fire({ title: 'Inicia sesión', text: 'Necesitamos tus datos para el pedido.', icon: 'info', confirmButtonText: 'Ir a Login', confirmButtonColor: '#0f172a' }).then(() => router.navigate('/login'));
            return;
        }
        cartManager.toggleCart(); 
        checkoutManager.open();   
    }
};

window.checkoutManager = {
    currentOrderId: null,
    lastOrderData: null,

    open: () => {
        const modal = document.getElementById('checkout-modal');
        const panel = document.getElementById('checkout-panel');
        document.getElementById('billing-form').classList.remove('hidden');
        document.getElementById('payment-section').classList.add('hidden');
        document.getElementById('success-section').classList.add('hidden');
        document.getElementById('billing-form').reset();
        document.getElementById('payment-code').value = '';
        if(state.user.displayName) document.getElementById('bill-name').value = state.user.displayName;
        modal.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    },
    close: () => {
        const modal = document.getElementById('checkout-modal');
        const panel = document.getElementById('checkout-panel');
        panel.classList.add('translate-x-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },
    goToPayment: () => {
        const req = ['bill-name', 'bill-dni', 'bill-phone', 'bill-dept', 'bill-prov', 'bill-dist'];
        for(let id of req) {
            if(!document.getElementById(id).value.trim()) return Swal.fire('Faltan datos', 'Por favor completa todos los campos obligatorios (*)', 'warning');
        }
        if(!document.getElementById('terms-check').checked) return Swal.fire('Términos', 'Debes aceptar los términos y condiciones.', 'warning');

        document.getElementById('billing-form').classList.add('hidden');
        document.getElementById('payment-section').classList.remove('hidden');
    },
    confirmOrder: async () => {
        const code = document.getElementById('payment-code').value;
        if(code.length !== 3) return Swal.fire('Código inválido', 'Ingresa los 3 dígitos de seguridad.', 'warning');
        Swal.showLoading();
        
        const expireTime = Date.now() + (10 * 60 * 1000);

        const orderData = {
            userId: state.user.uid,
            customerName: document.getElementById('bill-name').value,
            billing: {
                name: document.getElementById('bill-name').value,
                dni: document.getElementById('bill-dni').value,
                phone: document.getElementById('bill-phone').value,
                ruc: document.getElementById('bill-ruc').value || '---',
                address: `${document.getElementById('bill-dept').value}, ${document.getElementById('bill-prov').value}, ${document.getElementById('bill-dist').value}`
            },
            payment: { method: 'QR/Yape', securityCode: code },
            items: [...state.cart], 
            total: state.cart.reduce((a,b)=>a+(b.price*b.qty),0),
            date: new Date().toISOString(),
            status: 'Pendiente de Validación',
            expireAt: expireTime 
        };

        try {
            const newOrderRef = push(ref(db, `users/${state.user.uid}/orders`));
            const orderId = newOrderRef.key;
            
            const updates = {};
            updates[`users/${state.user.uid}/orders/${orderId}`] = orderData;
            updates[`all_orders/${orderId}`] = { ...orderData, id: orderId };

            state.cart.forEach(item => {
                const originalProd = PRODUCTS.find(p => p.id === item.id);
                if(originalProd) {
                    const newStock = (originalProd.stock || 0) - item.qty;
                    updates[`products/${item.id}/stock`] = newStock >= 0 ? newStock : 0;
                }
            });

            await update(ref(db), updates);
            
            checkoutManager.currentOrderId = orderId;
            checkoutManager.lastOrderData = orderData;

            state.cart = [];
            cartManager.save();

            document.getElementById('payment-section').classList.add('hidden');
            document.getElementById('success-section').classList.remove('hidden');
            
            const msg = `Hola, acabo de realizar el pedido ${orderId.slice(-6)}. Adjunto mi voucher.`;
            document.getElementById('whatsapp-link').href = `https://wa.me/51932321295?text=${encodeURIComponent(msg)}`;
            Swal.close();
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo registrar el pedido.', 'error');
        }
    },

    confirmWhatsAppOrder: async () => {
        Swal.showLoading();
        const expireTime = Date.now() + (10 * 60 * 1000);
        
        const orderData = {
            userId: state.user.uid,
            customerName: document.getElementById('bill-name').value,
            billing: {
                name: document.getElementById('bill-name').value,
                dni: document.getElementById('bill-dni').value,
                phone: document.getElementById('bill-phone').value,
                ruc: document.getElementById('bill-ruc').value || '---',
                address: `${document.getElementById('bill-dept').value}, ${document.getElementById('bill-prov').value}, ${document.getElementById('bill-dist').value}`
            },
            payment: { method: 'WhatsApp/Otro', securityCode: 'N/A' },
            items: [...state.cart],
            total: state.cart.reduce((a,b)=>a+(b.price*b.qty),0),
            date: new Date().toISOString(),
            status: 'Pendiente de Validación',
            expireAt: expireTime
        };

        try {
            const newOrderRef = push(ref(db, `users/${state.user.uid}/orders`));
            const orderId = newOrderRef.key;
            const updates = {};
            
            updates[`users/${state.user.uid}/orders/${orderId}`] = orderData;
            updates[`all_orders/${orderId}`] = { ...orderData, id: orderId };

            state.cart.forEach(item => {
                const originalProd = PRODUCTS.find(p => p.id === item.id);
                if(originalProd) {
                    const newStock = (originalProd.stock || 0) - item.qty;
                    updates[`products/${item.id}/stock`] = newStock >= 0 ? newStock : 0;
                }
            });

            await update(ref(db), updates);
            
            checkoutManager.currentOrderId = orderId;
            checkoutManager.lastOrderData = orderData;

            state.cart = [];
            cartManager.save();

            document.getElementById('payment-section').classList.add('hidden');
            document.getElementById('success-section').classList.remove('hidden');
            
            const msg = `Hola TechSaul, he realizado el pedido #${orderId.slice(-6)} por la web. Quiero coordinar el pago por otro medio (Transferencia/Plin/Efectivo).`;
            const waLink = `https://wa.me/51932321295?text=${encodeURIComponent(msg)}`;
            
            document.getElementById('whatsapp-link').href = waLink;
            window.open(waLink, '_blank');

            Swal.close();
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo registrar el pedido.', 'error');
        }
    },

    downloadPDF: () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const data = checkoutManager.lastOrderData;
        const oid = checkoutManager.currentOrderId ? checkoutManager.currentOrderId.slice(-6) : '---';

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("TechSaul", 14, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Voucher de Compra", 195, 18, { align: 'right' });
        doc.text(`Pedido: #${oid}`, 195, 23, { align: 'right' });
        
        if(data.payment.method === 'WhatsApp/Otro' || data.payment.securityCode === 'N/A') {
            doc.text(`Método: Coordinar WhatsApp`, 195, 28, { align: 'right' });
        } else {
            doc.text(`N° Operación: ${data.payment.securityCode}`, 195, 28, { align: 'right' });
        }
        
        doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 195, 33, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Datos del Cliente:", 14, 45);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const startInfoY = 52;
        doc.text(`Nombre:`, 14, startInfoY);       doc.text(data.billing.name, 45, startInfoY);
        doc.text(`Documento:`, 14, startInfoY+5); doc.text(data.billing.dni, 45, startInfoY+5);
        doc.text(`Teléfono:`, 14, startInfoY+10); doc.text(data.billing.phone, 45, startInfoY+10);
        doc.text(`Dirección:`, 14, startInfoY+15); doc.text(data.billing.address, 45, startInfoY+15);

        const tableBody = data.items.map(item => [
            item.qty, 
            item.name, 
            `S/ ${item.price.toFixed(2)}`, 
            `S/ ${(item.qty * item.price).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Cant.', 'Descripción', 'P. Unit', 'Subtotal']],
            body: tableBody,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: false, textColor: [0,0,0], fontStyle: 'bold', lineWidth: {bottom: 0.5}, lineColor: [200,200,200] },
            bodyStyles: { lineWidth: {bottom: 0.1}, lineColor: [230,230,230] },
            columnStyles: {
                0: { cellWidth: 20 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' }
            }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        
        doc.text(`Subtotal:`, 150, finalY, { align: 'right' });
        doc.text(`S/ ${data.total.toFixed(2)}`, 195, finalY, { align: 'right' });
        
        doc.text(`Envío:`, 150, finalY+6, { align: 'right' });
        doc.text(`GRATIS`, 195, finalY+6, { align: 'right' });

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(130, finalY+10, 195, finalY+10);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`TOTAL PAGADO:`, 150, finalY+18, { align: 'right' });
        doc.text(`S/ ${data.total.toFixed(2)}`, 195, finalY+18, { align: 'right' });

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("¡Gracias por comprar en TechSaul!", 105, finalY+35, { align: 'center' });
        doc.text("Este es un voucher de compra. Envíe su constancia de pago por WhatsApp.", 105, finalY+40, { align: 'center' });

        doc.save(`Voucher_TechSaul_${oid}.pdf`);
    }
};

window.authManager = {
    isRegistering: false,
    handleForm: async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const nameInput = document.getElementById('reg-name');
        try {
            Swal.showLoading();

            if (authManager.isRegistering) {
                if(!nameInput.value) throw new Error("El nombre es obligatorio");
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                
                await updateProfile(cred.user, { displayName: nameInput.value });
                
                const firstName = nameInput.value.split(' ')[0];
                if (state.user) state.user.displayName = nameInput.value; 
                const label = document.getElementById('auth-label');
                if (label) {
                    label.innerHTML = `Hola, ${firstName}<br><span class="text-green-400 font-normal">Mi Perfil</span>`;
                }

                await set(ref(db, 'users/' + cred.user.uid), { username: nameInput.value, email: email, createdAt: new Date().toISOString() });
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
            Swal.close();
            router.navigate('/');
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    },
    loginGoogle: async () => {
        try { 
            const res = await signInWithPopup(auth, new GoogleAuthProvider());
            const userRef = ref(db, 'users/' + res.user.uid);
            get(userRef).then((snapshot) => {
                if (!snapshot.exists()) {
                    set(userRef, { username: res.user.displayName, email: res.user.email, createdAt: new Date().toISOString() });
                }
            });
            router.navigate('/'); 
        } catch (e) { console.error(e); }
    },
    logout: async () => { 
        try {
            await signOut(auth); 
            Swal.fire({icon: 'success', title: 'Sesión Cerrada', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false});
            router.navigate('/'); 
        } catch(e) { console.error(e); }
    }
};

onAuthStateChanged(auth, (user) => {
    state.user = user;
    const label = document.getElementById('auth-label');
    if (user) {
        const name = user.displayName ? user.displayName.split(' ')[0] : 'Usuario';
        if (label) label.innerHTML = `Hola, ${name}<br><span class="text-green-400 font-normal">Mi Perfil</span>`;
        
        onValue(ref(db, `users/${user.uid}/favorites`), (snapshot) => {
            state.favorites.clear();
            const data = snapshot.val();
            if (data) Object.keys(data).forEach(key => state.favorites.add(key));
            router.handle(false); 
        });

        onValue(ref(db, `users/${user.uid}/orders`), (snapshot) => {
            const data = snapshot.val();
            state.orders = data ? Object.values(data).reverse() : [];
            if(window.location.search.includes('profile')) router.handle(false);
        });
    } else {
        if (label) label.innerHTML = `Mi Cuenta<br><span class="text-slate-400 font-normal">Entrar / Registro</span>`;
        state.favorites.clear();
        state.orders = [];
        router.handle();
    }
});

window.cartManager = {
    toggleCart: () => {
        const el = document.getElementById('cart-overlay'), p = document.getElementById('cart-panel'), bg = document.getElementById('cart-backdrop');
        if(el.classList.contains('hidden')) { el.classList.remove('hidden'); setTimeout(() => { bg.classList.remove('opacity-0'); p.classList.remove('translate-x-full'); }, 10); }
        else { bg.classList.add('opacity-0'); p.classList.add('translate-x-full'); setTimeout(() => el.classList.add('hidden'), 500); }
    },
    add: (id, qtyToAdd = 1) => {
        const p = PRODUCTS.find(x => x.id === id);
        if(!p) return Swal.fire('Error', 'Producto no disponible', 'error');
        if((p.stock || 0) <= 0) return Swal.fire('Agotado', 'Lo sentimos, este producto ya no tiene stock.', 'warning');
        
        const ex = state.cart.find(x => x.id === id);
        const currentQtyInCart = ex ? ex.qty : 0;

        if(currentQtyInCart + qtyToAdd > (p.stock || 0)) {
            return Swal.fire('Stock Insuficiente', `Solo quedan ${p.stock} unidades disponibles.`, 'warning');
        }

        if(ex) {
            ex.qty += qtyToAdd;
        } else {
            state.cart.push({...p, qty: qtyToAdd});
        }
        
        cartManager.save(); 
        Swal.fire({icon: 'success', title: 'Añadido', text: `${qtyToAdd} unidad(es) agregada(s)`, toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false});
    },
    changeQty: (id, delta) => {
        const item = state.cart.find(x => x.id === id);
        if(!item) return;
        const p = PRODUCTS.find(x => x.id === id);
        const newQty = item.qty + delta;

        if(newQty < 1) return; 
        if(newQty > (p.stock || 0)) return Swal.fire('Tope alcanzado', `Solo hay ${p.stock} unidades en stock.`, 'warning');

        item.qty = newQty;
        cartManager.save();
    },
    remove: (id) => { state.cart = state.cart.filter(x => x.id !== id); cartManager.save(); },
    save: () => {
        localStorage.setItem('techsaul_cart', JSON.stringify(state.cart));
        const c = state.cart.reduce((a,b)=>a+b.qty,0);
        const badge = document.getElementById('cart-count');
        badge.innerText = c; badge.classList.toggle('opacity-0', c === 0);
        cartManager.render();
    },
    render: () => {
        const div = document.getElementById('cart-items-container');
        let t = 0;
        div.innerHTML = state.cart.map(i => { 
            t += i.price*i.qty; 
            return `
            <div class="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <img src="${i.image}" class="w-16 h-16 object-cover rounded-lg">
                <div class="flex-1">
                    <h4 class="font-bold text-sm truncate text-slate-900 w-40">${i.name}</h4>
                    <div class="flex justify-between mt-2 items-center">
                        <span class="text-blue-600 font-bold text-sm">S/ ${(i.price*i.qty).toFixed(2)}</span>
                        <div class="flex items-center bg-white border border-slate-200 rounded-lg h-7">
                            <button onclick="cartManager.changeQty('${i.id}', -1)" class="px-2 hover:bg-slate-100 text-slate-600 rounded-l-lg h-full flex items-center justify-center"><i class="ph-bold ph-minus text-xs"></i></button>
                            <span class="text-xs font-bold px-2 min-w-[20px] text-center">${i.qty}</span>
                            <button onclick="cartManager.changeQty('${i.id}', 1)" class="px-2 hover:bg-slate-100 text-slate-600 rounded-r-lg h-full flex items-center justify-center"><i class="ph-bold ph-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>
                <button onclick="cartManager.remove('${i.id}')" class="text-slate-400 hover:text-red-500 transition px-2 self-center"><i class="ph-bold ph-trash"></i></button>
            </div>` 
        }).join('') || '<div class="flex flex-col items-center justify-center py-12 text-slate-400"><i class="ph ph-shopping-cart text-4xl mb-2"></i><p>Tu carrito está vacío</p></div>';
        document.getElementById('cart-total').innerText = `S/ ${t.toFixed(2)}`;
    }
};
cartManager.save();

window.detailQtyManager = {
    val: 1,
    update: (delta, maxStock) => {
        const current = parseInt(document.getElementById('detail-qty-display').innerText);
        let next = current + delta;
        if(next < 1) next = 1;
        if(next > maxStock) {
            next = maxStock;
            Swal.fire('Stock Máximo', `Solo hay ${maxStock} unidades disponibles.`, 'info');
        }
        document.getElementById('detail-qty-display').innerText = next;
    }
};

window.reviewManager = {
    currentRating: 0,
    setRating: (stars) => {
        reviewManager.currentRating = stars;
        for(let i=1; i<=5; i++) {
            const el = document.getElementById(`star-form-${i}`);
            if(el) {
                el.classList.remove('ph-bold', 'ph-fill', 'text-yellow-400', 'text-slate-300');
                if(i <= stars) el.classList.add('ph-fill', 'text-yellow-400');
                else el.classList.add('ph-bold', 'text-slate-300');
            }
        }
    },
    submitReview: async (productId) => {
        if (!state.user) return Swal.fire('Inicia Sesión', 'Debes estar registrado para comentar.', 'warning');
        if (reviewManager.currentRating === 0) return Swal.fire('Faltan estrellas', 'Por favor califica con estrellas.', 'warning');
        
        const comment = document.getElementById('review-comment').value;
        if (!comment.trim()) return Swal.fire('Falta comentario', 'Escribe tu opinión.', 'warning');

        const reviewData = {
            userId: state.user.uid,
            userName: state.user.displayName || 'Usuario',
            rating: reviewManager.currentRating,
            comment: comment,
            date: new Date().toISOString()
        };
        try {
            Swal.showLoading();
            await push(ref(db, `reviews/${productId}`), reviewData);
            const snapshot = await get(ref(db, `reviews/${productId}`));
            let totalStars = 0, totalReviews = 0;
            if (snapshot.exists()) {
                const reviews = Object.values(snapshot.val());
                totalReviews = reviews.length;
                totalStars = reviews.reduce((acc, curr) => acc + curr.rating, 0);
            }
            const newAverage = totalReviews > 0 ? (totalStars / totalReviews) : 0;
            await set(ref(db, `products/${productId}/rating`), newAverage);
            await set(ref(db, `products/${productId}/reviewCount`), totalReviews);
            Swal.fire('¡Gracias!', 'Tu opinión ha sido publicada.', 'success');
            router.navigate('product', {product: PRODUCTS.find(p=>p.id === productId).slug}); 
        } catch (e) { console.error(e); Swal.fire('Error', 'No se pudo enviar la reseña.', 'error'); }
    }
};

window.router = {
    navigate: (p, params = {}) => {
        let url = `?page=${p.replace('/','') || 'home'}`;
        Object.keys(params).forEach(k => url += `&${k}=${params[k]}`);
        window.history.pushState({}, '', url); 
        router.handle(true); 
    },
    handle: (doScroll = true) => {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || 'home';
        const app = document.getElementById('app');
        const header = document.getElementById('main-header');
        const footer = document.getElementById('main-footer');
        
        if (doScroll) window.scrollTo(0,0);

        if(page === 'login') { 
            header.style.display = 'none'; footer.style.display = 'none'; 
            app.className = "w-full fade-in";
        } else { 
            header.style.display = 'block'; footer.style.display = 'block'; 
            app.className = "flex-grow w-full fade-in min-h-[60vh] px-4 py-6"; 
        }

        if(page === 'home') renderHome(app);
        else if(page === 'shop') renderShop(app, params.get('category'), parseInt(params.get('pageNum') || 1), params.get('filter'));
        else if(page === 'product') renderProduct(app, params.get('product'));
        else if(page === 'login') renderLogin(app);
        else if(page === 'faq') renderFAQ(app);
        else if(page === 'profile') {
            if(!state.user && !auth.currentUser) { router.navigate('/login'); return; }
            renderProfile(app, params.get('tab'));
        }
    }
};

function ProductCard(p) {
    let isNew = false;
    if (p.date) {
        const diffDays = Math.abs(new Date() - new Date(p.date)) / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) isNew = true;
    }
    if (p.isNew === true) isNew = true;

    const isFav = state.favorites.has(p.id);
    const btnFavClass = isFav 
        ? "bg-red-50 text-red-500 border-red-200" 
        : "bg-white text-slate-400 border-slate-100 hover:text-red-500 hover:bg-red-50 hover:border-red-100";
    const iconFavClass = isFav ? "ph-fill ph-heart" : "ph-bold ph-heart";

    const finalPrice = (p.isOffer && p.offerPrice) ? p.offerPrice : p.price;
    const originalPrice = (p.isOffer && p.offerPrice) ? p.price : (p.price * 1.2);
    const stock = p.stock || 0;
    const isDisabled = stock <= 0;

    const stockColor = stock <= 5 ? 'text-red-500' : 'text-green-600';
    const stockBg = stock <= 5 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100';
    const stockIcon = stock <= 5 ? 'ph-fill ph-fire' : 'ph-bold ph-package'; 

    let badgeHTML = '';
    if (stock === 0) {
        badgeHTML = '<span class="absolute top-3 left-3 z-20 bg-slate-800 text-white text-[10px] font-extrabold px-3 py-1 rounded shadow-lg tracking-widest uppercase">Agotado</span>';
    } else if (p.isOffer) {
        const dcto = p.offerPrice ? Math.round(100 - ((p.offerPrice * 100) / p.price)) : 0;
        badgeHTML = `<span class="absolute top-3 left-3 z-20 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md flex items-center gap-1"><i class="ph-fill ph-lightning"></i> -${dcto}%</span>`;
    }

    let newBadgeHTML = '';
    if (isNew && stock > 0) {
        newBadgeHTML = `<span class="absolute top-3 right-3 z-20 bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded shadow-md uppercase tracking-wide flex items-center gap-1 border border-yellow-500/20"><i class="ph-bold ph-star"></i> Nuevo</span>`;
    }

    return `
    <div class="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] h-full flex flex-col">
        
        <div class="relative aspect-square bg-white overflow-hidden">
            ${badgeHTML}
            ${newBadgeHTML}
            <img src="${p.image}" onclick="router.navigate('product', {product: '${p.slug}'})" class="w-full h-full object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-110 ${isDisabled ? 'grayscale opacity-60' : 'cursor-pointer'}" loading="lazy">
            
            ${!isDisabled ? `<div class="absolute bottom-3 right-3 z-30 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out"><button onclick="event.stopPropagation(); cartManager.add('${p.id}')" class="hover-cart-animate h-12 px-6 bg-slate-900 text-white rounded-full shadow-xl flex items-center gap-2 hover:bg-yellow-400 hover:text-slate-900 transition-colors font-bold text-xs tracking-wide"><i class="ph-bold ph-shopping-cart text-lg"></i> <span>AGREGAR</span></button></div>` : ''}
            
            <div class="absolute bottom-3 left-3 z-30 -translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out delay-75">
                <button onclick="event.stopPropagation(); userActions.toggleFavorite('${p.id}')" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border shadow-md ${btnFavClass}"><i class="${iconFavClass} text-lg"></i></button>
            </div>
        </div>

        <div class="p-4 flex flex-col flex-grow relative bg-white z-20">
            
            <div class="flex justify-between items-center mb-2">
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${p.category}</div>
                ${stock > 0 ? 
                    `<div class="flex items-center gap-1 px-2 py-0.5 rounded-md border ${stockBg}">
                        <i class="${stockIcon} ${stockColor} text-[10px]"></i>
                        <span class="text-[10px] font-bold ${stockColor}">Stock: ${stock}</span>
                     </div>` 
                    : '<span class="text-[10px] font-bold text-slate-300">Sin Stock</span>'
                }
            </div>

            <h3 class="font-bold text-slate-900 text-sm mb-2 leading-snug line-clamp-2 cursor-pointer hover:text-yellow-600 transition-colors h-[2.5em]" onclick="router.navigate('product', {product: '${p.slug}'})">
                ${p.name}
            </h3>

            <div class="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                <div class="flex flex-col">
                    ${p.isOffer ? `<span class="text-xs text-slate-400 line-through font-medium">S/ ${originalPrice.toFixed(2)}</span>` : ''}
                    <span class="text-xl font-extrabold ${p.isOffer ? 'text-red-600' : 'text-slate-900'}">S/ ${finalPrice.toFixed(2)}</span>
                </div>
            </div>
        </div>
    </div>`;
}    

window.currentBannerIndex = 0;
window.totalBanners = 0;

window.moveBanner = (step) => {
    if (window.totalBanners <= 1) return;

    const prevSlide = document.getElementById(`banner-slide-${window.currentBannerIndex}`);
    const prevText = document.getElementById(`banner-text-${window.currentBannerIndex}`);
    const prevInd = document.getElementById(`indicator-${window.currentBannerIndex}`);
    
    if(prevSlide) prevSlide.classList.replace('opacity-40', 'opacity-0'); 
    if(prevText) {
        prevText.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
        prevText.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'); 
    }
    if(prevInd) { prevInd.classList.remove('bg-yellow-400', 'w-8'); prevInd.classList.add('bg-slate-500', 'w-4'); }

    window.currentBannerIndex = (window.currentBannerIndex + step + window.totalBanners) % window.totalBanners;

    const nextSlide = document.getElementById(`banner-slide-${window.currentBannerIndex}`);
    const nextText = document.getElementById(`banner-text-${window.currentBannerIndex}`);
    const nextInd = document.getElementById(`indicator-${window.currentBannerIndex}`);
    
    if(nextSlide) nextSlide.classList.replace('opacity-0', 'opacity-40'); 
    if(nextText) {
        nextText.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        nextText.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
    }
    if(nextInd) { nextInd.classList.remove('bg-slate-500', 'w-4'); nextInd.classList.add('bg-yellow-400', 'w-8'); }

    if (window.bannerInterval) clearInterval(window.bannerInterval);
    window.bannerInterval = setInterval(() => window.moveBanner(1), 6000);
};

function renderHome(container) {
    const offerProducts = PRODUCTS.filter(p => p.isOffer);
    const loopOffers = offerProducts.length > 0 ? [...offerProducts, ...offerProducts, ...offerProducts, ...offerProducts] : [];
    const displayOffers = loopOffers.slice(0, 20);

    if (window.bannerInterval) clearInterval(window.bannerInterval);

    if (!BANNER_DATA) {
        container.innerHTML = `
        <div class="w-full max-w-[1920px] mx-auto px-2 md:px-4">
            <div class="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 mb-12 min-h-[400px] md:min-h-[500px] flex items-center justify-center shadow-2xl animate-pulse">
                <div class="text-center">
                    <i class="ph ph-circle-notch animate-spin text-yellow-400 text-4xl mb-4 inline-block"></i>
                    <p class="text-slate-500 text-xs font-bold uppercase tracking-widest">Cargando Portada...</p>
                </div>
            </div>
        </div>`;
        return;
    }

    const productsHTML = PRODUCTS.length ? PRODUCTS.slice(0, 5).map(ProductCard).join('') : '<div class="col-span-full text-center py-8"><i class="ph ph-spinner animate-spin text-3xl"></i></div>';
    
    let banners = [];
    if(Array.isArray(BANNER_DATA)) {
        banners = BANNER_DATA;
    } else if (BANNER_DATA.image) {
        banners = [BANNER_DATA]; 
    } else {
        banners = [];
    }

    window.totalBanners = banners.length;
    window.currentBannerIndex = 0;

    const carouselImagesHTML = banners.map((b, index) => `
        <img src="${b.image}" 
             class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === 0 ? 'opacity-40' : 'opacity-0'}" 
             id="banner-slide-${index}">
    `).join('');

    const carouselTextsHTML = banners.map((b, index) => `
        <div id="banner-text-${index}" 
             class="absolute inset-0 flex flex-col justify-center px-12 md:px-24 max-w-5xl transition-all duration-700 ease-out 
             ${index === 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}">
            
            <div class="text-center md:text-left">
                <span class="inline-block py-1 px-3 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold mb-4 border border-yellow-400/30 uppercase tracking-widest">
                    ${b.badge || 'Destacado'}
                </span>
                <h2 class="text-4xl md:text-6xl xl:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
                    ${b.title || 'TechSaul'}
                </h2>
                <p class="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl drop-shadow-md mx-auto md:mx-0">
                    ${b.subtitle || ''}
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                    <button onclick="window.history.pushState({}, '', '${b.btnLink || '?page=shop'}'); router.handle(true);" class="bg-yellow-400 text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
                        ${b.btnText || 'Ver Productos'} <i class="ph-bold ph-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    const navButtonsHTML = banners.length > 1 ? `
        <button onclick="window.moveBanner(-1)" class="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition group border border-white/10 hover:border-white/30">
            <i class="ph-bold ph-caret-left text-2xl md:text-3xl group-hover:text-yellow-400 transition-colors"></i>
        </button>
        <button onclick="window.moveBanner(1)" class="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition group border border-white/10 hover:border-white/30">
            <i class="ph-bold ph-caret-right text-2xl md:text-3xl group-hover:text-yellow-400 transition-colors"></i>
        </button>
    ` : '';

    container.innerHTML = `
        <div class="w-full max-w-[1920px] mx-auto px-2 md:px-4">
            <div class="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 mb-12 min-h-[400px] md:min-h-[500px] shadow-2xl group/banner">
                
                ${carouselImagesHTML}
                
                <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent z-10 pointer-events-none"></div>
                
                <div class="relative z-20 h-full min-h-[400px] md:min-h-[500px]">
                    ${carouselTextsHTML}
                </div>

                ${navButtonsHTML}

                ${banners.length > 1 ? `
                <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
                    ${banners.map((_, idx) => `<button onclick="window.currentBannerIndex = ${idx}-1; window.moveBanner(1)" id="indicator-${idx}" class="h-1.5 rounded-full transition-all duration-300 hover:bg-yellow-400 ${idx === 0 ? 'bg-yellow-400 w-8' : 'bg-slate-500 w-4'}"></button>`).join('')}
                </div>` : ''}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition">
                    <div class="p-3 bg-blue-50 text-blue-600 rounded-full mb-3"><i class="ph-fill ph-shield-check text-2xl"></i></div>
                    <h4 class="font-bold text-slate-900 text-sm">Garantía Oficial</h4>
                    <p class="text-xs text-slate-500 mt-1">12 Meses asegurados</p>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition">
                    <div class="p-3 bg-green-50 text-green-600 rounded-full mb-3"><i class="ph-fill ph-truck text-2xl"></i></div>
                    <h4 class="font-bold text-slate-900 text-sm">Envío Nacional</h4>
                    <p class="text-xs text-slate-500 mt-1">A todo el Perú</p>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition">
                    <div class="p-3 bg-purple-50 text-purple-600 rounded-full mb-3"><i class="ph-fill ph-credit-card text-2xl"></i></div>
                    <h4 class="font-bold text-slate-900 text-sm">Pago Seguro</h4>
                    <p class="text-xs text-slate-500 mt-1">Tarjetas y Yape</p>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition">
                    <div class="p-3 bg-orange-50 text-orange-600 rounded-full mb-3"><i class="ph-fill ph-headset text-2xl"></i></div>
                    <h4 class="font-bold text-slate-900 text-sm">Soporte 24/7</h4>
                    <p class="text-xs text-slate-500 mt-1">Siempre en línea</p>
                </div>
            </div>
            <div class="flex justify-between items-end mb-6 px-2">
                <div><h2 class="text-2xl md:text-3xl font-bold text-slate-900">Destacados</h2><p class="text-slate-500 text-sm mt-1">Los favoritos de la comunidad TechSaul</p></div>
                <a href="#" onclick="event.preventDefault(); router.navigate('/shop')" class="text-blue-600 font-bold hover:text-blue-700 text-sm md:text-base flex items-center gap-1">Ver todo <i class="ph-bold ph-arrow-right"></i></a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 pb-12">
                ${productsHTML}
            </div>

            ${offerProducts.length > 0 ? `
            <div class="w-full py-12 mb-12 bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden relative group-offer">
                <div class="px-6 md:px-12 mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">Tiempo Limitado</span>
                        </div>
                        <h2 class="text-3xl font-extrabold text-slate-900">Ofertas Relámpago <i class="ph-fill ph-lightning text-yellow-400"></i></h2>
                        <p class="text-slate-500 mt-1">Aprovecha los mejores descuentos antes que se agoten.</p>
                    </div>
                    <button onclick="router.navigate('/shop', {filter: 'offers'})" class="whitespace-nowrap bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center gap-2">
                        Ver todas las ofertas <i class="ph-bold ph-arrow-right"></i>
                    </button>
                </div>

                <div class="relative w-full overflow-hidden py-4">
                    <div class="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-20 pointer-events-none"></div>
                    <div class="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-20 pointer-events-none"></div>
                    
                    <div class="animate-infinite-scroll flex gap-6 px-4">
                        ${displayOffers.map(p => `
                            <div class="w-[260px] flex-shrink-0 transform transition hover:scale-105 duration-300">
                                ${ProductCard(p)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
            </div>`;
        

    if(banners.length > 1) {
        window.bannerInterval = setInterval(() => window.moveBanner(1), 6000);
    }
}

function renderShop(container, category, currentPage = 1, filterType = null) {
    let items = category ? PRODUCTS.filter(p => p.category === category) : PRODUCTS;
    
    if (filterType === 'offers') {
        items = items.filter(p => p.isOffer === true);
    }

    const search = document.getElementById('global-search')?.value.toLowerCase() || document.getElementById('mobile-search-input')?.value.toLowerCase();
    
    if(search) {
        items = items.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));
    }
    
    items.sort((a, b) => {
        const now = new Date();
        const isNewA = a.date && ((now - new Date(a.date)) / (1000 * 60 * 60 * 24) <= 3);
        const isNewB = b.date && ((now - new Date(b.date)) / (1000 * 60 * 60 * 24) <= 3);
        const isLowStockA = (a.stock > 0 && a.stock <= 5);
        const isLowStockB = (b.stock > 0 && b.stock <= 5);

        if (a.isOffer && !b.isOffer) return -1;
        if (!a.isOffer && b.isOffer) return 1;
        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;
        if (isLowStockA && !isLowStockB) return -1;
        if (!isLowStockA && isLowStockB) return 1;
        return 0;
    });

    const itemsPerPage = 16;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    const catListDesktop = CATEGORIES.map(c => `
        <button onclick="router.navigate('/shop', {category: '${c.name}', pageNum: 1})" class="w-full text-left px-4 py-2.5 rounded-lg transition text-sm font-medium mb-1 flex justify-between items-center ${category === c.name ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}">
            <span>${c.name}</span>
            <i class="ph-bold ph-caret-right text-xs ${category === c.name ? 'text-yellow-400' : 'text-slate-300'}"></i>
        </button>`).join('');

    const catListMobile = CATEGORIES.map(c => `
        <button onclick="router.navigate('/shop', {category: '${c.name}', pageNum: 1})" class="whitespace-nowrap px-4 py-2 rounded-full border text-sm font-bold transition flex-shrink-0 ${category === c.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}">
            ${c.name}
        </button>`).join('');

    let paginationHTML = '';
    if (totalPages > 1) {
        paginationHTML = `<div class="flex flex-wrap justify-center items-center gap-2 mt-12 pt-8 border-t border-slate-200">`;
        
        if (currentPage > 1) {
            paginationHTML += `
            <button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${currentPage - 1}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition">
                <i class="ph-bold ph-caret-left"></i>
            </button>`;
        }

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: 1})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-sm font-bold transition">1</button>`;
            if (startPage > 2) paginationHTML += `<span class="text-slate-400 px-1">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            paginationHTML += `
            <button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${i}})" class="w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold transition ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">
                ${i}
            </button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += `<span class="text-slate-400 px-1">...</span>`;
            paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${totalPages}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-sm font-bold transition">${totalPages}</button>`;
        }

        if (currentPage < totalPages) {
            paginationHTML += `
            <button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${currentPage + 1}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition">
                <i class="ph-bold ph-caret-right"></i>
            </button>`;
        }
        
        paginationHTML += `</div><div class="text-center mt-4 text-xs text-slate-400">Página ${currentPage} de ${totalPages}</div>`;
    }

    container.innerHTML = `
        <div class="w-full max-w-[1920px] mx-auto px-2 md:px-4">
            <div class="mb-8 py-10 px-6 bg-slate-100 rounded-3xl text-center relative overflow-hidden">
                <div class="relative z-10">
          <h1 class="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2">${category ? category : (filterType === 'offers' ? 'Ofertas Disponibles' : 'Catálogo Completo')}</h1>
                    <p class="text-slate-500 text-sm md:text-base font-medium">
                        Mostrando ${paginatedItems.length} de ${totalItems} productos disponibles
                    </p>
                </div>
                <i class="ph-fill ph-storefront absolute -bottom-6 -right-6 text-slate-200 text-9xl transform -rotate-12"></i>
            </div>
            <div class="flex flex-col lg:flex-row gap-8 items-start mb-12">
                <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-24">
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <h3 class="font-bold text-slate-900 mb-4 px-2 text-lg border-b border-slate-100 pb-2">Categorías</h3>
                        <nav class="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                            <button onclick="router.navigate('/shop', {pageNum: 1})" class="w-full text-left px-4 py-2.5 rounded-lg transition text-sm font-medium mb-1 flex justify-between items-center ${!category ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}">
                                <span>Todas</span><i class="ph-bold ph-caret-right text-xs ${!category ? 'text-yellow-400' : 'text-slate-300'}"></i>
                            </button>
                            ${catListDesktop}
                        </nav>
                    </div>
                </aside>
                <div class="flex-1 w-full">
                    <div class="lg:hidden flex overflow-x-auto gap-2 pb-4 mb-4 no-scrollbar">
                        <button onclick="router.navigate('/shop', {pageNum: 1})" class="whitespace-nowrap px-4 py-2 rounded-full border text-sm font-bold transition flex-shrink-0 ${!category ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}">Todas</button>
                        ${catListMobile}
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        ${paginatedItems.length ? paginatedItems.map(ProductCard).join('') : `<div class="col-span-full flex flex-col items-center justify-center py-20 text-slate-400"><i class="ph ph-magnifying-glass text-6xl mb-4 text-slate-200"></i><p class="text-xl font-medium text-slate-600">No encontramos productos</p><p class="text-sm">Intenta con otra categoría o búsqueda</p></div>`}
                    </div>

                    ${paginationHTML}

                </div>
            </div>
        </div>`;
}

async function renderProduct(container, slug) {
    const p = PRODUCTS.find(x => x.slug === slug);
    if(!p) return container.innerHTML = "<div class='flex items-center justify-center h-96'><div class='text-center'><i class='ph ph-spinner animate-spin text-4xl mb-4'></i><p>Cargando o Producto no encontrado...</p></div></div>";
    
    const similarProducts = PRODUCTS.filter(item => item.category === p.category && item.id !== p.id);
    
    const loopSimilar = similarProducts.length > 0 ? [...similarProducts, ...similarProducts, ...similarProducts, ...similarProducts] : [];
    const displaySimilar = loopSimilar.slice(0, 20);

    let similarHTML = '';
    if(similarProducts.length > 0) {
        similarHTML = `
        <div class="mt-16 border-t border-slate-200 pt-12">
            <div class="mb-8 px-2">
                <h3 class="text-2xl font-bold text-slate-900 mb-1">Productos Similares</h3>
                <p class="text-slate-500 text-sm">Quienes vieron esto también compraron</p>
            </div>
            
            <div class="relative w-full overflow-hidden py-4">
                <div class="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f8fafc] to-transparent z-20 pointer-events-none"></div>
                <div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f8fafc] to-transparent z-20 pointer-events-none"></div>
                
                <div class="animate-infinite-scroll flex gap-6 px-4">
                    ${displaySimilar.map(sim => `
                        <div class="w-[280px] md:w-[300px] flex-shrink-0 transform transition hover:scale-105 duration-300 overflow-hidden">
                            ${ProductCard(sim)}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }

    const rating = p.rating ? parseFloat(p.rating).toFixed(1) : "0.0";
    const reviewsCount = p.reviewCount || 0;
    const stock = p.stock || 0;
    const isStock = stock > 0;
    const isFav = state.favorites.has(p.id);
    const allImages = [p.image, ...(p.gallery || [])];
    
    const thumbnailsHTML = allImages.length > 1 ? `<div class="flex gap-3 mt-4 overflow-x-auto pb-2 px-1 no-scrollbar justify-center">${allImages.map(img => `<button onclick="document.getElementById('main-product-img').src = '${img}'" class="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl border border-slate-200 bg-white p-1 hover:border-slate-900 hover:scale-105 transition shadow-sm overflow-hidden"><img src="${img}" class="w-full h-full object-contain"></button>`).join('')}</div>` : '';
    const starsHTML = Array(5).fill(0).map((_, i) => i < Math.round(rating) ? '<i class="ph-fill ph-star text-yellow-400"></i>' : '<i class="ph-bold ph-star text-slate-300"></i>').join('');

    let reviewsListHTML = '<div class="py-8 text-center text-slate-400">Cargando opiniones...</div>';
    try {
        const snap = await get(ref(db, `reviews/${p.id}`));
        if(snap.exists()) {
            const revs = Object.values(snap.val()).reverse();
            reviewsListHTML = revs.map(r => `<div class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">${r.userName.charAt(0).toUpperCase()}</div><span class="font-bold text-sm text-slate-900">${r.userName}</span></div><span class="text-xs text-slate-400">${new Date(r.date).toLocaleDateString()}</span></div><div class="flex text-yellow-400 text-xs mb-2">${Array(5).fill(0).map((_, i) => i < r.rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph-bold ph-star text-slate-300"></i>').join('')}</div><p class="text-slate-600 text-sm">${r.comment}</p></div>`).join('');
        } else { reviewsListHTML = '<div class="py-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">Aún no hay reseñas. ¡Sé el primero!</div>'; }
    } catch(e) { console.error(e); }

    let specsHTML = '<p class="text-slate-500 italic">No hay especificaciones detalladas.</p>';
    if (p.specifications) {
        const lines = p.specifications.split('\n').filter(line => line.trim() !== '');
        specsHTML = `<ul class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">${lines.map(line => `<li class="flex items-start gap-3 py-2 border-b border-slate-100 text-sm text-slate-700"><i class="ph-fill ph-check-circle text-green-500 mt-0.5"></i><span>${line}</span></li>`).join('')}</ul>`;
    }

    const reviewFormHTML = state.user ? `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
            <h4 class="font-bold text-slate-900 mb-4">Escribe tu opinión</h4>
            <div class="flex gap-2 mb-4 text-2xl cursor-pointer" id="star-selector">
                <i onclick="reviewManager.setRating(1)" id="star-form-1" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i>
                <i onclick="reviewManager.setRating(2)" id="star-form-2" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i>
                <i onclick="reviewManager.setRating(3)" id="star-form-3" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i>
                <i onclick="reviewManager.setRating(4)" id="star-form-4" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i>
                <i onclick="reviewManager.setRating(5)" id="star-form-5" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i>
            </div>
            <textarea id="review-comment" class="w-full p-3 rounded-xl border border-slate-200 mb-4 focus:border-yellow-400 outline-none text-sm bg-slate-50" rows="3" placeholder="¿Qué te pareció el producto?"></textarea>
            <button onclick="reviewManager.submitReview('${p.id}')" class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition">Publicar Reseña</button>
        </div>` : `<div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 text-center"><p class="text-blue-800 font-medium mb-3">Inicia sesión para compartir tu opinión</p><button onclick="router.navigate('/login')" class="bg-white text-slate-900 text-sm font-bold px-6 py-2 rounded-full border border-slate-200 hover:bg-slate-50">Ir al Login</button></div>`;

    container.innerHTML = `
        <div class="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-12">
            <button onclick="window.history.back()" class="mb-8 flex items-center text-slate-500 hover:text-slate-900 font-medium transition"><i class="ph-bold ph-arrow-left mr-2"></i> Volver a la tienda</button>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-12">
                <div class="lg:col-span-7">

   <div id="zoom-container" class="bg-white rounded-3xl p-8 flex flex-col items-center justify-center border border-slate-100 shadow-lg min-h-[400px] relative zoom-container group">
<img id="main-product-img" src="${p.image}" class="zoom-img w-full max-h-[500px] object-contain drop-shadow-2xl ${!isStock ? 'grayscale opacity-50' : ''}">
<div class="absolute top-6 right-6 pointer-events-none"><button onclick="userActions.toggleFavorite('${p.id}')" class="pointer-events-auto p-4 rounded-full border transition-all shadow-sm ${isFav ? "bg-red-50 text-red-500 border-red-200" : "bg-white text-slate-400 border-slate-200 hover:border-red-200 hover:text-red-500"}"><i class="${isFav ? 'ph-fill' : 'ph-bold'} ph-heart text-2xl"></i></button></div>
${!isStock ? '<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><span class="bg-slate-900 text-white text-xl font-bold px-6 py-3 rounded-full shadow-2xl transform -rotate-12">AGOTADO</span></div>' : ''}
</div>


                    ${thumbnailsHTML}
                </div>
                <div class="lg:col-span-5 flex flex-col">
                    <div class="mb-4 flex items-center gap-3">
                        <span class="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">${p.category}</span>
                        <span class="text-xs font-bold ${isStock ? 'text-green-600' : 'text-red-500'} flex items-center gap-1"><i class="ph-fill ${isStock ? 'ph-check-circle' : 'ph-x-circle'}"></i> ${isStock ? `Stock: ${stock}` : 'Agotado'}</span>
                    </div>
                    <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">${p.name}</h1>
                    <div class="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                        <div class="flex flex-col">
                            <span class="text-sm text-slate-400 line-through mb-1">Antes: S/ ${(p.isOffer && p.offerPrice ? p.price : p.price * 1.2).toFixed(2)}</span>
                            <span class="text-4xl font-bold ${p.isOffer ? 'text-red-600' : 'text-slate-900'} tracking-tight">S/ ${(p.isOffer && p.offerPrice ? p.offerPrice : p.price).toFixed(2)}</span>
                        </div>
                        <div class="h-12 w-px bg-slate-200"></div>
                        <div class="flex flex-col cursor-pointer" onclick="document.getElementById('tab-btn-reviews').click()">
                            <div class="flex text-xl mb-1">${starsHTML}</div>
                            <span class="text-xs text-slate-500 font-bold hover:text-blue-600 transition underline">${rating} (${reviewsCount} Opiniones)</span>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-4 h-14 mb-8">
                        ${isStock ? `<div class="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-2 w-full sm:w-40 border border-slate-200"><button onclick="detailQtyManager.update(-1, ${stock})" class="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-900 hover:text-yellow-500 transition"><i class="ph-bold ph-minus"></i></button><span id="detail-qty-display" class="font-extrabold text-lg text-slate-900">1</span><button onclick="detailQtyManager.update(1, ${stock})" class="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-900 hover:text-yellow-500 transition"><i class="ph-bold ph-plus"></i></button></div>` : ''}
                        <button onclick="${isStock ? `cartManager.add('${p.id}', parseInt(document.getElementById('detail-qty-display').innerText))` : ''}" class="flex-1 font-bold h-full px-8 rounded-xl shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95 ${isStock ? "bg-yellow-400 hover:bg-yellow-300 text-slate-900 shadow-yellow-400/20" : "bg-slate-200 text-slate-400 cursor-not-allowed"}" ${!isStock ? 'disabled' : ''}><i class="ph-bold ph-shopping-cart text-xl"></i> ${isStock ? 'Añadir al Carrito' : 'Sin Stock'}</button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100"><i class="ph-fill ph-truck text-2xl text-slate-400"></i><div class="text-xs font-bold text-slate-600">Envío Rápido<br><span class="font-normal text-slate-400">A nivel nacional</span></div></div>
                        <div class="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100"><i class="ph-fill ph-shield-check text-2xl text-slate-400"></i><div class="text-xs font-bold text-slate-600">Garantía<br><span class="font-normal text-slate-400">12 meses oficial</span></div></div>
                    </div>
                </div>
            </div>
            <div class="max-w-5xl mx-auto">
                <div class="flex border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
                    <button onclick="switchTab('desc')" id="tab-btn-desc" class="px-6 py-4 text-sm font-bold border-b-2 border-slate-900 text-slate-900 transition whitespace-nowrap">Descripción</button>
                    <button onclick="switchTab('specs')" id="tab-btn-specs" class="px-6 py-4 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition whitespace-nowrap">Especificaciones</button>
                    <button onclick="switchTab('reviews')" id="tab-btn-reviews" class="px-6 py-4 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition whitespace-nowrap">Opiniones (${reviewsCount})</button>
                </div>
                <div id="content-desc" class="tab-content fade-in"><h3 class="text-xl font-bold text-slate-900 mb-4">Detalles del Producto</h3><p class="text-lg text-slate-600 leading-relaxed whitespace-pre-line">${p.description}</p></div>
                <div id="content-specs" class="tab-content hidden fade-in"><h3 class="text-xl font-bold text-slate-900 mb-6">Especificaciones Técnicas</h3><div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">${specsHTML}</div></div>
                <div id="content-reviews" class="tab-content hidden fade-in"><div class="max-w-3xl"><h3 class="text-xl font-bold text-slate-900 mb-6">Lo que dicen nuestros clientes</h3>${reviewFormHTML}<div class="space-y-2 mt-6">${reviewsListHTML}</div></div></div>
            </div>

            ${similarHTML}

        </div>`;

    const zoomContainer = document.getElementById('zoom-container');
    const zoomImg = document.getElementById('main-product-img');

    if (zoomContainer && zoomImg && isStock) { 
        zoomContainer.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = zoomContainer.getBoundingClientRect();
            const x = ((e.clientX - left) / width) * 100;
            const y = ((e.clientY - top) / height) * 100;

            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = 'scale(2)';
        });

        zoomContainer.addEventListener('mouseleave', () => {
            zoomImg.style.transformOrigin = 'center center';
            zoomImg.style.transform = 'scale(1)';
        });
    }

    window.switchTab = (tab) => {
        ['desc', 'specs', 'reviews'].forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            const content = document.getElementById(`content-${t}`);
            if(t === tab) { btn.classList.remove('border-transparent', 'text-slate-500'); btn.classList.add('border-slate-900', 'text-slate-900'); content.classList.remove('hidden'); } 
            else { btn.classList.add('border-transparent', 'text-slate-500'); btn.classList.remove('border-slate-900', 'text-slate-900'); content.classList.add('hidden'); }
        });
    };
}

function renderProfile(container, tab = 'summary') {
    const u = state.user;
    const userName = u.displayName || 'Usuario';
    const userEmail = u.email;
    const userInitial = userName.charAt(0).toUpperCase();
    const favProducts = PRODUCTS.filter(p => state.favorites.has(p.id));

    let contentHTML = '';
    if (tab === 'summary') {
        contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div class="p-4 bg-blue-50 text-blue-600 rounded-xl"><i class="ph-bold ph-package text-3xl"></i></div><div><div class="text-3xl font-bold text-slate-900">${state.orders.length}</div><div class="text-sm text-slate-500 font-medium">Pedidos Totales</div></div></div><div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div class="p-4 bg-red-50 text-red-600 rounded-xl"><i class="ph-bold ph-heart text-3xl"></i></div><div><div class="text-3xl font-bold text-slate-900">${state.favorites.size}</div><div class="text-sm text-slate-500 font-medium">Favoritos</div></div></div><div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div class="p-4 bg-yellow-50 text-yellow-600 rounded-xl"><i class="ph-bold ph-star text-3xl"></i></div><div><div class="text-3xl font-bold text-slate-900">VIP</div><div class="text-sm text-slate-500 font-medium">Nivel de Miembro</div></div></div></div><div class="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm"><h3 class="font-bold text-xl mb-6 flex items-center gap-2"><i class="ph-bold ph-user-circle"></i> Información Personal</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="p-4 bg-slate-50 rounded-xl border border-slate-100"><label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</label><div class="font-bold text-slate-800 text-lg mt-1">${userName}</div></div><div class="p-4 bg-slate-50 rounded-xl border border-slate-100"><label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label><div class="font-bold text-slate-800 text-lg mt-1">${userEmail}</div></div></div></div>`;
    } else if (tab === 'orders') {
        if (state.orders.length === 0) {
            contentHTML = `<div class="bg-white rounded-2xl border border-slate-100 p-12 text-center"><div class="inline-block p-6 bg-slate-50 rounded-full mb-4"><i class="ph ph-package text-4xl text-slate-400"></i></div><h3 class="text-xl font-bold text-slate-900">Sin pedidos aún</h3><p class="text-slate-500 mb-6">Explora nuestra tienda y encuentra lo que buscas.</p><button onclick="router.navigate('/shop')" class="bg-slate-900 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-800">Ir a la Tienda</button></div>`;
        } else {
            setTimeout(() => {
                if(window.orderTimerInterval) clearInterval(window.orderTimerInterval);
                window.orderTimerInterval = setInterval(() => {
                    const timers = document.querySelectorAll('.order-timer');
                    if(timers.length === 0) return;
                    timers.forEach(el => {
                        const expire = parseInt(el.dataset.expire);
                        const diff = expire - Date.now();
                        if(diff <= 0) {
                            el.innerHTML = "Tiempo Agotado";
                            el.parentElement.className = "mt-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded inline-block border border-red-100";
                        } else {
                            const m = Math.floor(diff / 60000);
                            const s = Math.floor((diff % 60000) / 1000);
                            el.innerText = `${m}:${s < 10 ? '0' : ''}${s} min para validar pago`;
                        }
                    });
                }, 1000);
            }, 100);

            contentHTML = `<div class="space-y-4">${state.orders.map((o, idx) => {
                let timerHTML = '';
                if(o.status === 'Pendiente de Validación' && o.expireAt) {
                    if(o.expireAt > Date.now()) {
                        timerHTML = `<div class="mt-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded inline-block border border-orange-100"><i class="ph-bold ph-clock"></i> <span class="order-timer" data-expire="${o.expireAt}">Calculando...</span></div>`;
                    } else {
                        timerHTML = `<div class="mt-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded inline-block border border-red-100"><i class="ph-bold ph-warning"></i> Tiempo de reserva agotado</div>`;
                    }
                }
                return `<div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div><div class="flex items-center gap-3 mb-2"><span class="font-bold text-lg text-slate-900">Pedido #${o.id ? o.id.slice(-6) : (Date.now()-idx).toString().slice(-6)}</span><span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">${o.status}</span></div><div class="text-sm text-slate-500 mb-2"><i class="ph-bold ph-calendar-blank mr-1"></i> ${new Date(o.date).toLocaleDateString()} · ${new Date(o.date).toLocaleTimeString()}</div><div class="text-sm text-slate-700 font-medium">${o.items ? o.items.length : 0} productos</div>${timerHTML}</div><div class="flex flex-col items-end gap-2 w-full md:w-auto"><span class="text-2xl font-bold text-slate-900">S/ ${o.total.toFixed(2)}</span><button class="text-sm text-blue-600 font-bold hover:underline">Ver Detalles</button></div></div>`;
            }).join('')}</div>`;
        }
    } else if (tab === 'favorites') {
        if (favProducts.length === 0) contentHTML = `<div class="bg-white rounded-2xl border border-slate-100 p-12 text-center"><div class="inline-block p-6 bg-slate-50 rounded-full mb-4"><i class="ph ph-heart-break text-4xl text-slate-400"></i></div><h3 class="text-xl font-bold text-slate-900">Sin favoritos</h3><p class="text-slate-500">Guarda lo que te gusta para comprarlo después.</p></div>`;
        else contentHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${favProducts.map(ProductCard).join('')}</div>`;
    }

    container.innerHTML = `
        <div class="w-full max-w-[1920px] mx-auto">
            <div class="profile-banner text-white pt-12 pb-24 px-6 md:px-12 relative overflow-hidden">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div class="relative z-10 flex flex-col md:flex-row items-center gap-8 max-w-7xl mx-auto">
                    <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center text-4xl md:text-5xl font-extrabold shadow-2xl border-4 border-slate-800">${userInitial}</div>
                    <div class="text-center md:text-left"><h1 class="text-3xl md:text-5xl font-extrabold mb-2">Hola, ${userName}</h1><p class="text-slate-300 text-lg">${userEmail} · Miembro TechSaul</p></div>
                    <div class="md:ml-auto"><button onclick="authManager.logout()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-full font-bold backdrop-blur-md transition flex items-center gap-2"><i class="ph-bold ph-sign-out"></i> Cerrar Sesión</button></div>
                </div>
            </div>
            <div class="px-4 md:px-8 -mt-12 pb-12 relative z-20">
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-col lg:flex-row gap-8">
                        <div class="w-full lg:w-72 flex-shrink-0">
                            <div class="bg-white rounded-2xl shadow-lg border border-slate-100 p-2 sticky top-24">
                                <nav class="space-y-1">
                                    <button onclick="router.navigate('/profile', {tab: 'summary'})" class="w-full text-left px-4 py-3 rounded-xl transition flex items-center gap-3 font-bold ${tab==='summary' ? 'bg-slate-900 text-yellow-400 shadow-md' : 'text-slate-600 hover:bg-slate-50'}"><i class="ph-bold ph-user text-xl"></i> Resumen</button>
                                    <button onclick="router.navigate('/profile', {tab: 'orders'})" class="w-full text-left px-4 py-3 rounded-xl transition flex items-center gap-3 font-bold ${tab==='orders' ? 'bg-slate-900 text-yellow-400 shadow-md' : 'text-slate-600 hover:bg-slate-50'}"><i class="ph-bold ph-package text-xl"></i> Mis Pedidos</button>
                                    <button onclick="router.navigate('/profile', {tab: 'favorites'})" class="w-full text-left px-4 py-3 rounded-xl transition flex items-center gap-3 font-bold ${tab==='favorites' ? 'bg-slate-900 text-yellow-400 shadow-md' : 'text-slate-600 hover:bg-slate-50'}"><i class="ph-bold ph-heart text-xl"></i> Favoritos</button>
                                </nav>
                            </div>
                        </div>
                        <div class="flex-1 fade-in"><h2 class="text-2xl font-bold text-slate-900 mb-6 capitalize hidden lg:block">${tab === 'summary' ? 'Resumen de tu cuenta' : tab === 'orders' ? 'Historial de compras' : 'Tus productos favoritos'}</h2>${contentHTML}</div>
                    </div>
                </div>
            </div>
        </div>`;
}

window.togglePass = () => {
    const input = document.getElementById('auth-pass');
    const icon = document.getElementById('pass-icon');
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('ph-eye-slash');
        icon.classList.add('ph-eye');
    } else {
        input.type = "password";
        icon.classList.remove('ph-eye');
        icon.classList.add('ph-eye-slash');
    }
};

function renderLogin(container) {
    const isReg = authManager.isRegistering;
    container.innerHTML = `
        <div class="flex min-h-screen w-full bg-white">
            <div class="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1950&q=80" class="absolute inset-0 w-full h-full object-cover opacity-50">
                <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
                <div class="relative z-10 p-12 text-white max-w-lg">
                    <div class="flex items-center gap-3 mb-6"><i class="ph-fill ph-circuitry text-yellow-400 text-4xl"></i><h1 class="text-4xl font-extrabold tracking-tighter">Tech<span class="text-yellow-400">Saul</span></h1></div>
                    <h2 class="text-5xl font-bold leading-tight mb-6">La tecnología que mueve tu mundo.</h2>
                    <p class="text-lg text-slate-300 mb-8">Únete a nuestra comunidad premium y accede a ofertas exclusivas en audio, fotografía y computación.</p>
                </div>
            </div>
            <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative bg-white">
                <button onclick="router.navigate('/')" class="absolute top-8 left-8 text-slate-400 hover:text-slate-900 transition flex items-center gap-2 font-bold text-sm"><i class="ph-bold ph-arrow-left text-lg"></i> Volver al inicio</button>
                <div class="w-full max-w-md space-y-8">
                    <div class="text-center lg:text-left"><h2 class="text-3xl md:text-4xl font-extrabold text-slate-900">${isReg?'Crear Cuenta':'Bienvenido de nuevo'}</h2><p class="text-slate-500 mt-2 text-lg">${isReg?'Empieza tu viaje tecnológico hoy.':'Ingresa tus datos para continuar.'}</p></div>
                    
                    <form id="auth-form" class="space-y-5">
                        ${isReg ? `<div class="space-y-2"><label class="text-sm font-bold text-slate-700 ml-1">Nombre Completo</label><div class="relative"><i class="ph-bold ph-user absolute left-4 top-4 text-slate-400 text-lg"></i><input type="text" id="reg-name" required placeholder="Ej. Saúl Perez" class="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-slate-900 focus:bg-white outline-none transition font-medium text-slate-900"></div></div>` : ''}
                        
                        <div class="space-y-2"><label class="text-sm font-bold text-slate-700 ml-1">Correo Electrónico</label><div class="relative"><i class="ph-bold ph-envelope absolute left-4 top-4 text-slate-400 text-lg"></i><input type="email" id="auth-email" required placeholder="hola@correo.com" class="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-slate-900 focus:bg-white outline-none transition font-medium text-slate-900"></div></div>
                        
                        <div class="space-y-2">
                            <div class="flex justify-between ml-1"><label class="text-sm font-bold text-slate-700">Contraseña</label></div>
                            <div class="relative">
                                <i class="ph-bold ph-lock absolute left-4 top-4 text-slate-400 text-lg"></i>
                                
                                <input type="password" id="auth-pass" required placeholder="••••••••" class="w-full pl-12 pr-12 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-slate-900 focus:bg-white outline-none transition font-medium text-slate-900">
                                
                                <button type="button" onclick="togglePass()" class="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-900 transition z-10">
                                    <i id="pass-icon" class="ph-bold ph-eye-slash text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl hover:bg-slate-800 hover:scale-[1.02] transition transform active:scale-95">${isReg?'Registrarme Gratis':'Iniciar Sesión'}</button>
                    </form>
                    
                    <p class="text-center text-slate-600 font-medium mt-8">${isReg?'¿Ya eres miembro?':'¿No tienes cuenta?'} <button id="toggle-auth" class="text-slate-900 font-bold hover:underline ml-1">${isReg?'Inicia Sesión':'Regístrate ahora'}</button></p>
                </div>
            </div>
        </div>`;
    
    document.getElementById('auth-form').addEventListener('submit', authManager.handleForm);
    document.getElementById('toggle-auth').onclick = () => { authManager.isRegistering = !isReg; renderLogin(container); };
}

function renderFAQ(container) {
    container.innerHTML = `
        <div class="w-full max-w-3xl mx-auto py-12 px-4">
            <div class="text-center mb-12"><h1 class="text-4xl font-extrabold text-slate-900 mb-4">Centro de Ayuda</h1><p class="text-slate-500">Resolvemos tus dudas más comunes</p></div>
            <div class="space-y-4">${FAQS.map(f => `<details class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm group transition hover:border-yellow-400"><summary class="font-bold text-lg cursor-pointer flex justify-between items-center list-none text-slate-900">${f.q} <div class="bg-slate-100 p-2 rounded-full group-open:bg-yellow-400 transition"><i class="ph-bold ph-caret-down transition-transform group-open:rotate-180"></i></div></summary><p class="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">${f.a}</p></details>`).join('')}</div>
        </div>`;
}

window.addEventListener('popstate', router.handle);
window.addEventListener('DOMContentLoaded', () => { 
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.classList.add('splash-fade-out'); 
            setTimeout(() => splash.remove(), 500);   
        }
    }, 2000); 
    router.handle(); 
    document.getElementById('global-search')?.addEventListener('keypress', e=>{if(e.key==='Enter')router.navigate('shop')}); 
});