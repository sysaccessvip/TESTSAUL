
        
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
        
        let app;
        try { app = initializeApp(firebaseConfig); } catch(e){ app = firebase.app(); }
        const auth = getAuth(app);
        const db = getDatabase(app);

        let PRODUCTS = []; 
        let CATEGORIES = [];
        let BANNER_DATA = null;
        let VACATION_SETTINGS = null; // <--- AGREGAR ESTO
        let bannerInterval = null;

        onValue(ref(db, 'products'), (snapshot) => {
            if (snapshot.exists()) {
                PRODUCTS = Object.values(snapshot.val());
                router.handle();
            } else { PRODUCTS = []; router.handle(); }
        });

onValue(ref(db, 'categories'), (snapshot) => {
            if (snapshot.exists()) {
                const rawCats = Object.values(snapshot.val());
                
                // ORDENAR: 
                // 1. Primero las Fijadas (isPinned).
                // 2. Luego alfabéticamente por Nombre (A-Z).
                CATEGORIES = rawCats.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    // Si ambos tienen el mismo estado (fijado o no), ordenar por nombre A-Z
                    return a.name.localeCompare(b.name);
                });
                
                router.handle();
            } else { 
                CATEGORIES = []; 
                router.handle(); 
            }
        });
        

// AGREGAR ESTE NUEVO onValue:
        onValue(ref(db, 'settings/vacation_mode'), (snapshot) => {
            if (snapshot.exists()) {
                VACATION_SETTINGS = snapshot.val();
                checkVacationPopup(); // Verificar si mostramos el popup al cargar o cambiar datos
            } else {
                VACATION_SETTINGS = null;
            }
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
            orders: [],
            points: 0,
            wallet: 0
        };


// FUNCIÓN PARA VERIFICAR SI ESTAMOS EN VACACIONES HOY
        window.isVacationActive = () => {
            if (!VACATION_SETTINGS || !VACATION_SETTINGS.isActive) return false;
            
            const now = new Date();
            // Ajustamos horas para comparar solo fechas (ignorar hora exacta)
            const currentStr = now.toISOString().split('T')[0];
            
            // Comparación simple de strings YYYY-MM-DD funciona bien
            return currentStr >= VACATION_SETTINGS.startDate && currentStr <= VACATION_SETTINGS.endDate;
        };

        // FUNCIÓN PARA MOSTRAR POPUP AL ENTRAR
        window.checkVacationPopup = () => {
            // Solo mostrar si es activo, estamos en fecha, y no lo acabamos de cerrar en esta sesión (opcional)
            if (isVacationActive()) {
                // Usamos un toast fijo en la parte superior o un modal
                Swal.fire({
                    title: '🛑 Aviso Importante',
                    html: `<p class="text-lg font-bold text-slate-700">${VACATION_SETTINGS.message}</p>
                           <p class="text-sm text-slate-500 mt-2">Puedes ver productos y añadir al carrito, pero <b>no procesaremos pedidos</b> hasta el ${new Date(VACATION_SETTINGS.endDate).toLocaleDateString()}.</p>`,
                    icon: 'info',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#0f172a',
                    backdrop: `rgba(0,0,123,0.4)`
                });
            }
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
            redeemPoints: async () => {
                if (state.points < 100) return Swal.fire('Faltan Puntos', 'Necesitas mínimo 100 puntos para canjear.', 'info');
                
                const result = await Swal.fire({
                    title: '¿Canjear Puntos?',
                    text: "Canjea 100 Puntos por S/ 10.00 de saldo en tu monedero.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, canjear',
                    confirmButtonColor: '#fbbf24', 
                    cancelButtonText: 'Cancelar'
                });

                if (result.isConfirmed) {
                    try {
                        Swal.showLoading();
                        const cost = 100;
                        const reward = 10; 
                        
                        const newPoints = state.points - cost;
                        const newWallet = state.wallet + reward;

                        const updates = {};
                        updates[`users/${state.user.uid}/points`] = newPoints;
                        updates[`users/${state.user.uid}/wallet`] = newWallet;

                        await update(ref(db), updates);
                        Swal.fire('¡Canje Exitoso!', `Tienes S/ ${reward}.00 más en tu monedero.`, 'success');
                    } catch(e) {
                        console.error(e);
                        Swal.fire('Error', 'No se pudo procesar el canje.', 'error');
                    }
                }
            },
checkout: () => {
                // --- BLOQUEO POR VACACIONES ---
                if (isVacationActive()) {
                    cartManager.toggleCart(); // Cerrar carrito para ver mejor la alerta
                    return Swal.fire({
                        title: 'Compras Pausadas',
                        html: `<div class="text-center">
                                <i class="ph-fill ph-calendar-x text-5xl text-orange-500 mb-3"></i>
                                <p class="font-bold text-lg mb-2">No estamos atendiendo pedidos temporalmente.</p>
                                <p class="bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-800 text-sm">${VACATION_SETTINGS.message}</p>
                                <p class="text-xs text-slate-400 mt-3">Podrás comprar nuevamente a partir del <b>${new Date(VACATION_SETTINGS.endDate).toLocaleDateString()}</b>.</p>
                               </div>`,
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#0f172a'
                    });
                }
                // ------------------------------

                if (state.cart.length === 0) return Swal.fire('Carrito Vacío', 'Agrega productos antes de pagar.', 'warning');
                if (!state.user) {
                    cartManager.toggleCart();
                    Swal.fire({ title: 'Inicia sesión', text: 'Necesitamos tus datos para el pedido.', icon: 'info', confirmButtonText: 'Ir a Login', confirmButtonColor: '#0f172a' }).then(() => router.navigate('/login'));
                    return;
                }
                cartManager.toggleCart(); 
                checkoutManager.open();   
            },
            // FUNCIONES DEL MODAL DE DETALLES
            showOrderDetails: (orderId) => {
                const order = state.orders.find(o => o.id === orderId);
                if (!order) return console.error("Pedido no encontrado en state.orders");

                const modal = document.getElementById('order-details-modal');
                const panel = document.getElementById('order-details-panel');
                const content = document.getElementById('order-details-content');
                
                // Verificar que el HTML del modal existe
                if(!modal || !panel || !content) return console.error("Falta el HTML del modal en el documento");

                document.getElementById('od-modal-id').innerText = `Pedido #${order.id.slice(-6)}`;

// 1. Generar lista de productos (CON BOTÓN DE RESEÑA SI ESTÁ APROBADO)
                const isApproved = order.status === 'Aprobado';
                
                const itemsHTML = (order.items || []).map(i => {
                    // Botón de reseña solo si está aprobado
                    const reviewBtn = isApproved 
                        ? `<button onclick="router.navigate('product', {product: '${i.slug}'}); setTimeout(() => { document.getElementById('tab-btn-reviews').click(); document.getElementById('reviews-section').scrollIntoView({behavior: 'smooth'}); }, 800);" class="mt-3 w-full py-2.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold hover:bg-yellow-400 hover:text-slate-900 hover:border-yellow-400 transition flex items-center justify-center gap-2 shadow-sm group"><i class="ph-fill ph-star group-hover:animate-bounce"></i> Dejar Comentario</button>` 
                        : '';

                    return `
                    <div class="flex gap-4 py-4 border-b border-slate-100 last:border-0 bg-white p-3 rounded-xl mb-2 shadow-sm">
                        <img src="${i.image}" class="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm text-slate-900 line-clamp-2 mb-1">${i.name}</h4>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">${i.qty} unid.</span>
                                <span class="font-bold text-sm text-slate-900">S/ ${(i.qty * i.price).toFixed(2)}</span>
                            </div>
                            ${reviewBtn}
                        </div>
                    </div>`;
                }).join('');

                // 2. Verificar descuento Monedero
                let walletHTML = '';
                if(order.walletUsed && order.walletUsed > 0) {
                    walletHTML = `
                    <div class="flex justify-between items-center text-sm mb-2 px-2">
                        <span class="text-green-600 font-bold flex items-center gap-1"><i class="ph-fill ph-wallet"></i> Desc. Monedero</span>
                        <span class="text-green-600 font-bold">- S/ ${order.walletUsed.toFixed(2)}</span>
                    </div>`;
                }

                // 3. Renderizar todo el contenido
                content.innerHTML = `
                    <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <div class="bg-blue-500 text-white rounded-full p-1 shrink-0"><i class="ph-fill ph-info text-lg"></i></div>
                        <div class="text-xs text-blue-800 flex-1">
                            <p class="font-bold mb-1 text-sm">Estado: ${order.status}</p>
                            <p>Fecha: ${new Date(order.date).toLocaleDateString()} a las ${new Date(order.date).toLocaleTimeString()}</p>
                            <p class="mt-1 opacity-75">Entrega en: ${order.billing.address}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">Productos Comprados</h3>
                        <div class="space-y-2">${itemsHTML}</div>
                    </div>

                    <div>
                        <h3 class="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">Resumen Financiero</h3>
                        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div class="flex justify-between items-center text-sm mb-2 text-slate-500 px-2">
                                <span>Subtotal</span>
                                <span>S/ ${(order.originalTotal || order.total).toFixed(2)}</span>
                            </div>
                            ${walletHTML}
                            <div class="border-t border-slate-100 my-3 pt-3 flex justify-between items-center px-2">
                                <span class="font-extrabold text-slate-900 text-lg">Total Pagado</span>
                                <span class="font-extrabold text-slate-900 text-lg">S/ ${order.total.toFixed(2)}</span>
                            </div>
                            <div class="mt-2 text-[10px] text-center text-slate-400 bg-slate-50 py-1 rounded">Método de Pago: ${order.payment.method}</div>
                        </div>
                    </div>
                `;

                modal.classList.remove('hidden');
                setTimeout(() => panel.classList.remove('translate-x-full'), 10);
            },

            closeOrderDetails: () => {
                const modal = document.getElementById('order-details-modal');
                const panel = document.getElementById('order-details-panel');
                if(modal && panel) {
                    panel.classList.add('translate-x-full');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                }
            }
        };

        

window.checkoutManager = {
            // --- DATOS TELEGRAM ---
            telegramToken: '8527181742:AAGwQ0F8bYBj0u5kDWV11nwE7YaM0SmBVGk', 
            telegramChatId: '7284372417',       
            
            sendTelegramAlert: async (order) => {
                const oid = order.id ? order.id.slice(-6) : '---';
                const itemsList = order.items.map(i => `- ${i.qty}x ${i.name}`).join('\n');
                
                // --- AQUI AGREGAMOS EL N° DE OPERACIÓN ---
                const textRaw = `🚨 *NUEVO PEDIDO RECIBIDO* 🚨\n\n` +
                             `🆔 *Pedido:* ${oid}\n` + 
                             `👤 *Cliente:* ${order.billing.name}\n` +
                             `📞 *Tel:* ${order.billing.phone}\n` +
                             `💰 *Total:* S/ ${order.total.toFixed(2)}\n` +
                             `💳 *Pago:* ${order.payment.method}\n` +
                             `🔢 *N° Operación:* ${order.payment.securityCode}\n\n` + // <--- NUEVA LÍNEA
                             `📦 *Productos:*\n${itemsList}`;

                const encodedText = encodeURIComponent(textRaw);
                const url = `https://api.telegram.org/bot${window.checkoutManager.telegramToken}/sendMessage?chat_id=${window.checkoutManager.telegramChatId}&text=${encodedText}&parse_mode=Markdown`;

                try { await fetch(url); } catch (e) { console.error("Error Telegram", e); }
            },

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
                
                const walletSection = document.getElementById('wallet-discount-section');
                if(walletSection) walletSection.remove();

                if(state.wallet > 0) {
                    const form = document.getElementById('billing-form');
                    const div = document.createElement('div');
                    div.id = 'wallet-discount-section';
                    div.className = "bg-green-50 border border-green-200 p-4 rounded-xl flex items-center justify-between mb-4";
                    div.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="bg-green-500 text-white rounded-full p-1"><i class="ph-bold ph-wallet text-xl"></i></div>
                            <div>
                                <div class="text-sm font-bold text-green-800">Usar Saldo Monedero</div>
                                <div class="text-xs text-green-600">Disponible: S/ ${state.wallet.toFixed(2)}</div>
                            </div>
                        </div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="use-wallet-check" class="w-5 h-5 accent-green-600 rounded">
                            <span class="text-sm font-bold text-slate-700">Aplicar</span>
                        </label>
                    `;
                    const btn = form.querySelector('button[type="button"]'); 
                    form.insertBefore(div, btn);
                }

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

                const originalTotal = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
                let finalTotal = originalTotal;
                let walletDiscount = 0;
                const useWallet = document.getElementById('use-wallet-check')?.checked;

                if (useWallet && state.wallet > 0) {
                    if (state.wallet >= finalTotal) {
                        walletDiscount = finalTotal;
                        finalTotal = 0;
                    } else {
                        walletDiscount = state.wallet;
                        finalTotal = finalTotal - walletDiscount;
                    }
                }

                const displayEl = document.getElementById('payment-total-display');
                if (walletDiscount > 0) {
                    displayEl.innerHTML = `<div class="flex flex-col items-center leading-tight"><span class="text-sm text-slate-400 line-through font-medium">Subtotal: S/ ${originalTotal.toFixed(2)}</span><span class="text-xs text-green-600 font-bold mb-1">(- S/ ${walletDiscount.toFixed(2)} Monedero)</span><span>S/ ${finalTotal.toFixed(2)}</span></div>`;
                } else {
                    displayEl.innerHTML = `S/ ${finalTotal.toFixed(2)}`;
                }

                document.getElementById('billing-form').classList.add('hidden');
                document.getElementById('payment-section').classList.remove('hidden');
            },

            backToBilling: () => {
                document.getElementById('payment-section').classList.add('hidden');
                document.getElementById('billing-form').classList.remove('hidden');
            },

            confirmOrder: async () => {
                const code = document.getElementById('payment-code').value;
                if(code.length !== 3) return Swal.fire('Código inválido', 'Ingresa los 3 dígitos de seguridad.', 'warning');
                Swal.showLoading();
                
                const expireTime = Date.now() + (10 * 60 * 1000);
                const useWallet = document.getElementById('use-wallet-check')?.checked;
                let walletUsed = 0;
                let finalTotal = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
                const originalTotal = finalTotal;

                if (useWallet && state.wallet > 0) {
                    if (state.wallet >= finalTotal) {
                        walletUsed = finalTotal;
                        finalTotal = 0;
                    } else {
                        walletUsed = state.wallet;
                        finalTotal = finalTotal - walletUsed;
                    }
                }

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
                    total: finalTotal,
                    originalTotal: originalTotal,
                    walletUsed: walletUsed,
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

                    if (walletUsed > 0) updates[`users/${state.user.uid}/wallet`] = (state.wallet - walletUsed);

                    await update(ref(db), updates);
                    checkoutManager.currentOrderId = orderId;
                    checkoutManager.lastOrderData = orderData;

                    checkoutManager.sendTelegramAlert({ ...orderData, id: orderId });

                    state.cart = [];
                    cartManager.save();

                    document.getElementById('payment-section').classList.add('hidden');
                    document.getElementById('success-section').classList.remove('hidden');
                    
                    const msg = `Hola, acabo de realizar el pedido ${orderId.slice(-6)}. Adjunto mi voucher.`;
                    document.getElementById('whatsapp-link').href = `https://wa.me/51960436357?text=${encodeURIComponent(msg)}`;
                    Swal.close();
                } catch (err) {
                    console.error(err);
                    Swal.fire('Error', 'No se pudo registrar el pedido.', 'error');
                }
            },

            confirmWhatsAppOrder: async () => {
                Swal.showLoading();
                const expireTime = Date.now() + (10 * 60 * 1000);
                const useWallet = document.getElementById('use-wallet-check')?.checked;
                let walletUsed = 0;
                let finalTotal = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
                const originalTotal = finalTotal;

                if (useWallet && state.wallet > 0) {
                    if (state.wallet >= finalTotal) {
                        walletUsed = finalTotal;
                        finalTotal = 0;
                    } else {
                        walletUsed = state.wallet;
                        finalTotal = finalTotal - walletUsed;
                    }
                }

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
                    total: finalTotal,
                    originalTotal: originalTotal,
                    walletUsed: walletUsed,
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

                    if (walletUsed > 0) updates[`users/${state.user.uid}/wallet`] = (state.wallet - walletUsed);

                    await update(ref(db), updates);
                    checkoutManager.currentOrderId = orderId;
                    checkoutManager.lastOrderData = orderData;

                    checkoutManager.sendTelegramAlert({ ...orderData, id: orderId });

                    state.cart = [];
                    cartManager.save();

                    document.getElementById('payment-section').classList.add('hidden');
                    document.getElementById('success-section').classList.remove('hidden');
                    
                    const msg = `Hola TechSaul, he realizado el pedido #${orderId.slice(-6)} por la web. Quiero coordinar el pago por otro medio (Transferencia/Plin/Efectivo).`;
                    const waLink = `https://wa.me/51960436357?text=${encodeURIComponent(msg)}`;
                    
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

                doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("TechSaul", 14, 22);
                doc.setFontSize(10); doc.setFont("helvetica", "normal");
                doc.text("Voucher de Compra", 195, 18, { align: 'right' });
                doc.text(`Pedido: #${oid}`, 195, 23, { align: 'right' });
                
                if(data.payment.method === 'WhatsApp/Otro' || data.payment.securityCode === 'N/A') {
                    doc.text(`Método: Coordinar WhatsApp`, 195, 28, { align: 'right' });
                } else {
                    doc.text(`N° Operación: ${data.payment.securityCode}`, 195, 28, { align: 'right' });
                }
                
                doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 195, 33, { align: 'right' });
                doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Datos del Cliente:", 14, 45);
                doc.setFontSize(10); doc.setFont("helvetica", "normal");
                const startInfoY = 52;
                doc.text(`Nombre:`, 14, startInfoY); doc.text(data.billing.name, 45, startInfoY);
                doc.text(`Documento:`, 14, startInfoY+5); doc.text(data.billing.dni, 45, startInfoY+5);
                doc.text(`Teléfono:`, 14, startInfoY+10); doc.text(data.billing.phone, 45, startInfoY+10);
                doc.text(`Dirección:`, 14, startInfoY+15); doc.text(data.billing.address, 45, startInfoY+15);

                const tableBody = data.items.map(item => [item.qty, item.name, `S/ ${item.price.toFixed(2)}`, `S/ ${(item.qty * item.price).toFixed(2)}`]);
                doc.autoTable({ startY: 80, head: [['Cant.', 'Descripción', 'P. Unit', 'Subtotal']], body: tableBody, theme: 'plain', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: false, textColor: [0,0,0], fontStyle: 'bold', lineWidth: {bottom: 0.5}, lineColor: [200,200,200] }, bodyStyles: { lineWidth: {bottom: 0.1}, lineColor: [230,230,230] }, columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } } });

                let finalY = doc.lastAutoTable.finalY + 10;
                doc.text(`Subtotal:`, 150, finalY, { align: 'right' }); doc.text(`S/ ${data.originalTotal.toFixed(2)}`, 195, finalY, { align: 'right' });
                if (data.walletUsed > 0) { finalY += 6; doc.text(`Desc. Monedero:`, 150, finalY, { align: 'right' }); doc.text(`- S/ ${data.walletUsed.toFixed(2)}`, 195, finalY, { align: 'right' }); }
                doc.text(`Envío:`, 150, finalY+6, { align: 'right' }); doc.text(`GRATIS`, 195, finalY+6, { align: 'right' });
                doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(130, finalY+10, 195, finalY+10);
                doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`TOTAL PAGADO:`, 150, finalY+18, { align: 'right' }); doc.text(`S/ ${data.total.toFixed(2)}`, 195, finalY+18, { align: 'right' });
                doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100); doc.text("¡Gracias por comprar en TechSaul!", 105, finalY+35, { align: 'center' }); doc.text("Este es un voucher de compra. Envíe su constancia de pago por WhatsApp.", 105, finalY+40, { align: 'center' });
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
                        // Lógica de Registro (Igual que antes)
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        const userIP = ipData.ip.replace(/\./g, '-'); 
                        const today = new Date().toLocaleDateString();

                        const ipLogRef = ref(db, `security_logs/${userIP}`);
                        const ipSnapshot = await get(ipLogRef);

                        if (ipSnapshot.exists()) {
                            const lastDate = ipSnapshot.val().date;
                            if (lastDate === today) throw new Error("Bloqueo de Seguridad: Para crear una nueva cuenta intenta mañana.");
                        }
                        if(!nameInput.value) throw new Error("El nombre es obligatorio");

                        const cred = await createUserWithEmailAndPassword(auth, email, pass);
                        await set(ipLogRef, { date: today });
                        await updateProfile(cred.user, { displayName: nameInput.value });
                        await set(ref(db, 'users/' + cred.user.uid), { 
                            username: nameInput.value, email: email, createdAt: new Date().toISOString(),
                            registeredIP: ipData.ip, points: 0, wallet: 0, isBlocked: false
                        });
                    } else {
                        // LOGIN NORMAL
                        const cred = await signInWithEmailAndPassword(auth, email, pass);
                        
                        // --- NUEVA VALIDACIÓN DE BLOQUEO AL ENTRAR ---
                        const userRef = ref(db, `users/${cred.user.uid}`);
                        const snapshot = await get(userRef);
                        const userData = snapshot.val();

                        if (userData && userData.isBlocked === true) {
                            await signOut(auth); // Lo sacamos inmediatamente
                            throw new Error("⛔ TU CUENTA ESTÁ BLOQUEADA POR SEGURIDAD. Contacta a soporte.");
                        }
                        // ---------------------------------------------
                    }
                    Swal.close();
                    router.navigate('/'); // Enviar al inicio
                } catch (err) {
                    console.error(err);
                    let msg = err.message.replace("Firebase: ", "").replace("Error ", "");
                    if(err.code === 'auth/invalid-credential') msg = "Correo o contraseña incorrectos.";
                    Swal.fire('Atención', msg, 'error');
                }
            },
            logout: async () => { 
                try {
                    await signOut(auth); 
                    // Limpieza total
                    state.user = null;
                    state.cart = [];
                    state.orders = [];
                    state.favorites.clear();
                    localStorage.removeItem('techsaul_cart');
                    
                    Swal.fire({icon: 'success', title: 'Sesión Cerrada', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false});
                    
                    // FORZAR IR AL INICIO
                    router.navigate('/');
                    window.location.reload(); 
                } catch(e) { console.error(e); }
            }
        };

onAuthStateChanged(auth, (user) => {
            state.user = user;
            const label = document.getElementById('auth-label');
            
            if (user) {
                // 1. UI: Mostrar Nombre
                const name = user.displayName ? user.displayName.split(' ')[0] : 'Usuario';


// --- NUEVO: MONITOR DE BLOQUEO EN TIEMPO REAL ---
// --- MONITOR DE BLOQUEO EN TIEMPO REAL MEJORADO ---
                onValue(ref(db, `users/${user.uid}/isBlocked`), async (snapshot) => {
                    const isBlocked = snapshot.val();
                    if (isBlocked === true) {
                        // Si se detecta bloqueo, cerramos sesión y mandamos al home
                        await signOut(auth);
                        state.user = null; // Limpiar estado local
                        router.navigate('/'); // Navegar visualmente al home
                        
                        Swal.fire({
                            title: 'Acceso Restringido',
                            html: '<p>Tu cuenta ha sido bloqueada temporalmente.</p>',
                            icon: 'error',
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#0f172a',
                            allowOutsideClick: false,
                            allowEscapeKey: false
                        }).then(() => {
                            window.location.reload(); // Recarga final para limpiar todo rastro
                        });
                    }
                });
                // ------------------------------------------------
                // ------------------------------------------------


                if (label) label.innerHTML = `Hola, ${name}<br><span class="text-green-400 font-normal">Mi Perfil</span>`;
                
                const cartRef = ref(db, `users/${user.uid}/cart`);

                // 2. FUSIÓN INICIAL (Solo se ejecuta una vez al conectar)
                // Sirve para no perder lo que agregaste antes de loguearte
                get(cartRef).then((snapshot) => {
                    const cloudCart = snapshot.val() || [];
                    const localCart = state.cart; 

                    if (localCart.length > 0) {
                        // Si tengo productos locales, los mezclo con la nube
                        const finalMap = new Map();
                        cloudCart.forEach(item => finalMap.set(item.id, item));
                        localCart.forEach(item => {
                            if (finalMap.has(item.id)) {
                                const existing = finalMap.get(item.id);
                                existing.qty += item.qty;
                                finalMap.set(item.id, existing);
                            } else {
                                finalMap.set(item.id, item);
                            }
                        });
                        // Subimos la mezcla perfecta a la nube
                        set(cartRef, Array.from(finalMap.values()));
                    }
                });

                // 3. ¡AQUÍ ESTÁ LA MAGIA! -> ESCUCHA EN TIEMPO REAL (onValue)
                // Esto reemplaza al 'get' simple. Se queda escuchando cambios para siempre.
                onValue(cartRef, (snapshot) => {
                    const data = snapshot.val();
                    
                    // Actualizamos la variable local con lo que diga la nube
                    state.cart = data || []; 
                    
                    // Guardamos en LocalStorage para que no parpadee al recargar
                    localStorage.setItem('techsaul_cart', JSON.stringify(state.cart));
                    
                    // Actualizamos el ícono del carrito (burbuja roja)
                    const c = state.cart.reduce((a,b)=>a+b.qty,0);
                    const badge = document.getElementById('cart-count');
                    if(badge) {
                        badge.innerText = c; 
                        badge.classList.toggle('opacity-0', c === 0);
                    }
                    
                    // Si el carrito está abierto, redibujamos los productos
                    cartManager.render(); 
                });

                // 4. Cargar Favoritos (También en tiempo real)
                onValue(ref(db, `users/${user.uid}/favorites`), (snapshot) => {
                    state.favorites.clear();
                    const data = snapshot.val();
                    if (data) Object.keys(data).forEach(key => state.favorites.add(key));
                    
                    // Si estamos en la página de perfil, refrescar
                    if(window.location.search.includes('profile')) router.handle(false);
                    // O refrescar las tarjetas de productos (corazones)
                    const app = document.getElementById('app');
                    if (app && !window.location.search.includes('profile')) router.handle(false);
                });

                // 5. Cargar Pedidos y Notificaciones
                onValue(ref(db, `users/${user.uid}/orders`), (snapshot) => {
                    const data = snapshot.val();
                    const newOrders = data ? Object.entries(data).map(([key, value]) => ({ ...value, id: key })).reverse() : [];

                    // Detector de "Pedido Aprobado" para notificar
                    if (state.orders.length > 0) { 
                        newOrders.forEach(newOrder => {
                            const oldOrder = state.orders.find(o => o.id === newOrder.id);
                            if (oldOrder && oldOrder.status !== 'Aprobado' && newOrder.status === 'Aprobado') {
                                Swal.fire({
                                    title: '¡Pago Validado! 🎉',
                                    html: `<p class="text-sm">Tu pedido <b>#${newOrder.id.slice(-6)}</b> ha sido aprobado.</p>`,
                                    icon: 'success',
                                    toast: true, position: 'top-end', showConfirmButton: true, confirmButtonText: 'Ver', timer: 10000
                                }).then((r) => { if(r.isConfirmed) router.navigate('/profile', { tab: 'orders' }); });
                            }
                        });
                    }
                    state.orders = newOrders;
                    if(window.location.search.includes('profile')) router.handle(false);
                });

            } else {
                // LOGOUT: Limpieza
                if (label) label.innerHTML = `Mi Cuenta<br><span class="text-slate-400 font-normal">Entrar / Registro</span>`;
                state.favorites.clear();
                state.orders = [];
                state.cart = []; // Vaciamos carrito visual al salir
                localStorage.removeItem('techsaul_cart'); // Opcional: limpiar local
                cartManager.render();
                const badge = document.getElementById('cart-count');
                if(badge) badge.classList.add('opacity-0');
                
                router.handle();
            }
        });

        window.waManager = {
            isOpen: false,
            toggle: () => {
                const box = document.getElementById('wa-chat-window');
                const mainIcon = document.getElementById('wa-icon-main');
                const closeIcon = document.getElementById('wa-icon-close');
                
                waManager.isOpen = !waManager.isOpen;

                if (waManager.isOpen) {
                    box.classList.remove('scale-0', 'opacity-0');
                    mainIcon.classList.add('opacity-0', 'scale-50');
                    closeIcon.classList.remove('opacity-0', 'scale-50');
                    setTimeout(() => document.getElementById('wa-message-input').focus(), 300);
                } else {
                    box.classList.add('scale-0', 'opacity-0');
                    mainIcon.classList.remove('opacity-0', 'scale-50');
                    closeIcon.classList.add('opacity-0', 'scale-50');
                }
            },
            send: () => {
                const input = document.getElementById('wa-message-input');
                const text = input.value.trim();
                if (!text) return;
                const phone = "51960436357";
                const msg = `Hola TechSaul, tengo una consulta: ${text}`;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                input.value = '';
                waManager.toggle();
            }
        };


window.cartManager = {
            toggleCart: () => {
                const el = document.getElementById('cart-overlay'), p = document.getElementById('cart-panel'), bg = document.getElementById('cart-backdrop');
                if(el.classList.contains('hidden')) { el.classList.remove('hidden'); setTimeout(() => { bg.classList.remove('opacity-0'); p.classList.remove('translate-x-full'); }, 10); }
                else { bg.classList.add('opacity-0'); p.classList.add('translate-x-full'); setTimeout(() => el.classList.add('hidden'), 500); }
            },
            add: (id, qtyToAdd = 1) => {
                const p = PRODUCTS.find(x => x.id === id);
                if(!p) return Swal.fire('Error', 'Producto no disponible', 'error');
                
                // Conversión a números para evitar errores
                const currentStock = parseInt(p.stock || 0);
                if(currentStock <= 0) return Swal.fire('Agotado', 'Lo sentimos, este producto ya no tiene stock.', 'warning');
                
                const ex = state.cart.find(x => x.id === id);
                const currentQtyInCart = ex ? parseInt(ex.qty) : 0;

                if(currentQtyInCart + qtyToAdd > currentStock) {
                    return Swal.fire('Stock Insuficiente', `Solo quedan ${currentStock} unidades disponibles.`, 'warning');
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
                
                const currentStock = parseInt(p.stock || 0);
                const newQty = parseInt(item.qty) + delta;

                if(newQty < 1) return; 
                if(newQty > currentStock) return Swal.fire('Tope alcanzado', `Solo hay ${currentStock} unidades en stock.`, 'warning');

                item.qty = newQty;
                cartManager.save();
            },
            remove: (id) => { state.cart = state.cart.filter(x => x.id !== id); cartManager.save(); },
            
            save: () => {
                // 1. Guardar en local (LocalStorage)
                localStorage.setItem('techsaul_cart', JSON.stringify(state.cart));
                
                // 2. Renderizar contador y vista del carrito
                const c = state.cart.reduce((a,b)=>a+parseInt(b.qty),0);
                const badge = document.getElementById('cart-count');
                if(badge) {
                    badge.innerText = c; 
                    badge.classList.toggle('opacity-0', c === 0);
                }
                cartManager.render();

                // 3. LOGICA DE SEGURIDAD (CLOUD + BLOQUEO)
                if (state.user) {
                    // A. Sincronizar carrito con Firebase
                    const cartRef = ref(db, `users/${state.user.uid}/cart`);
                    set(cartRef, state.cart).catch(err => console.error("Error sync cart", err));

                    // B. DETECCIÓN DE ACAPARAMIENTO (ANTI-STOCK)
                    let productosAgotadosPorUsuario = 0;
                    
                    state.cart.forEach(item => {
                        // Buscamos el producto original en la lista global
                        const prodReal = PRODUCTS.find(p => p.id === item.id);
                        if (prodReal) {
                            const stockReal = parseInt(prodReal.stock || 0);
                            const qtyEnCarrito = parseInt(item.qty || 0);

                            // Si el usuario tiene en su carrito IGUAL o MÁS que el stock real
                            if (stockReal > 0 && qtyEnCarrito >= stockReal) {
                                productosAgotadosPorUsuario++;
                            }
                        }
                    });

                    // SI HA AGOTADO EL STOCK DE 2 O MÁS PRODUCTOS -> BLOQUEO INMEDIATO
                    if (productosAgotadosPorUsuario >= 2) {
                        
                        // 1. Marcar en base de datos
                        update(ref(db, `users/${state.user.uid}`), { isBlocked: true });

                        // 2. Cerrar sesión visualmente YA MISMO (sin esperar promesa)
                        authManager.logout();
                        
                        // 3. Mostrar alerta de bloqueo
                        Swal.fire({
                            title: '⛔ CUENTA BLOQUEADA',
                            html: `<p>El sistema detectó un intento de acaparamiento de stock (tienes todo el stock de ${productosAgotadosPorUsuario} productos en tu carrito).</p><br><p class="text-sm">Tu cuenta ha sido suspendida temporalmente por seguridad.</p>`,
                            icon: 'error',
                            confirmButtonColor: '#0f172a',
                            confirmButtonText: 'Entendido',
                            allowOutsideClick: false,
                            allowEscapeKey: false
                        }).then(() => {
                            window.location.reload();
                        });
                    }
                }
            },

            render: () => {
                const div = document.getElementById('cart-items-container');
                let t = 0;
                div.innerHTML = state.cart.map(i => { 
                    t += i.price * i.qty; 
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



// --- FUNCIONES VIDEO YOUTUBE ---
window.getYoutubeId = (url) => {
    if(!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

window.openVideoModal = (url) => {
    const videoId = getYoutubeId(url);
    if (!videoId) return Swal.fire('Error', 'Link no válido', 'error');
    const modal = document.getElementById('video-modal');
    document.getElementById('video-iframe').src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closeVideoModal = () => {
    const modal = document.getElementById('video-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('video-iframe').src = "";
    }, 300);
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
                
                // --- VALIDACIÓN DE SEGURIDAD ---
                const hasPurchased = state.orders.some(order => 
                    order.status === 'Aprobado' && 
                    order.items && 
                    order.items.some(item => item.id === productId)
                );
                
                if (!hasPurchased) {
                    return Swal.fire('Acceso denegado', 'Debes comprar y validar este producto para opinar.', 'error');
                }
                // -------------------------------

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
               else if(page === 'shop') renderShop(app, params.get('category'), parseInt(params.get('pageNum') || 1), params.get('filter'), params.get('search'));
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



let pointsBadgeHTML = '';
if (p.points && p.points > 0) {
    pointsBadgeHTML = `<span class="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md text-yellow-400 text-[10px] font-bold px-2 py-1 rounded shadow-md border border-yellow-400/30 flex items-center gap-1"><i class="ph-fill ph-star"></i> +${p.points} Pts</span>`;
}


// Dentro de function ProductCard(p)...

return `
<div class="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] h-full flex flex-col">
<div class="relative aspect-square overflow-hidden bg-slate-50" style="background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(to right, #e2e8f0 1px, transparent 1px); background-size: 40px 40px;">
        ${badgeHTML}
        ${newBadgeHTML}
        <img src="${p.image}" onclick="router.navigate('product', {product: '${p.slug}'})" class="w-full h-full object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-110 ${isDisabled ? 'grayscale opacity-60' : 'cursor-pointer'}" loading="lazy">
        ${!isDisabled ? `<div class="absolute bottom-3 right-3 z-30 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out"><button onclick="event.stopPropagation(); cartManager.add('${p.id}')" class="hover-cart-animate h-12 px-6 bg-slate-900 text-white rounded-full shadow-xl flex items-center gap-2 hover:bg-yellow-400 hover:text-slate-900 transition-colors font-bold text-xs tracking-wide"><i class="ph-bold ph-shopping-cart text-lg"></i> <span>AGREGAR</span></button></div>` : ''}
        <div class="absolute bottom-3 left-3 z-30 -translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out delay-75">
            <button onclick="event.stopPropagation(); userActions.toggleFavorite('${p.id}')" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border shadow-md ${btnFavClass}"><i class="${iconFavClass} text-lg"></i></button>
        </div>
    </div>
    
    <div class="p-4 flex flex-col flex-grow relative bg-white z-20">
        <div class="flex justify-between items-start mb-3"> 
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">${p.category}</div>
            
            <div class="flex flex-col items-end gap-1">
                ${stock > 0 ? `<div class="flex items-center gap-1 px-2 py-0.5 rounded-md border ${stockBg}"><i class="${stockIcon} ${stockColor} text-[10px]"></i><span class="text-[10px] font-bold ${stockColor}">Stock: ${stock}</span></div>` : '<span class="text-[10px] font-bold text-slate-300">Sin Stock</span>'}
                
                ${p.points ? `<div class="flex items-center gap-1 px-2 py-0.5 rounded-md border border-yellow-200 bg-yellow-50"><i class="ph-fill ph-star text-yellow-500 text-[10px]"></i><span class="text-[10px] font-bold text-yellow-700">+${p.points} Pts</span></div>` : ''}
            </div>
        </div>

        <h3 class="font-bold text-slate-900 text-sm mb-2 leading-snug line-clamp-2 cursor-pointer hover:text-yellow-600 transition-colors h-[2.5em]" onclick="router.navigate('product', {product: '${p.slug}'})">${p.name}</h3>
        
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
            if(prevText) { prevText.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto'); prevText.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'); }
            if(prevInd) { prevInd.classList.remove('bg-yellow-400', 'w-8'); prevInd.classList.add('bg-slate-500', 'w-4'); }

            window.currentBannerIndex = (window.currentBannerIndex + step + window.totalBanners) % window.totalBanners;

            const nextSlide = document.getElementById(`banner-slide-${window.currentBannerIndex}`);
            const nextText = document.getElementById(`banner-text-${window.currentBannerIndex}`);
            const nextInd = document.getElementById(`indicator-${window.currentBannerIndex}`);
            
            if(nextSlide) nextSlide.classList.replace('opacity-0', 'opacity-40'); 
            if(nextText) { nextText.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none'); nextText.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto'); }
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
                container.innerHTML = `<div class="w-full max-w-[1920px] mx-auto px-2 md:px-4"><div class="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 mb-12 min-h-[400px] md:min-h-[500px] flex items-center justify-center shadow-2xl animate-pulse"><div class="text-center"><i class="ph ph-circle-notch animate-spin text-yellow-400 text-4xl mb-4 inline-block"></i><p class="text-slate-500 text-xs font-bold uppercase tracking-widest">Cargando Portada...</p></div></div></div>`;
                return;
            }

            const productsHTML = PRODUCTS.length ? PRODUCTS.slice(0, 5).map(ProductCard).join('') : '<div class="col-span-full text-center py-8"><i class="ph ph-spinner animate-spin text-3xl"></i></div>';
            
            let banners = [];
            if(Array.isArray(BANNER_DATA)) { banners = BANNER_DATA; } else if (BANNER_DATA.image) { banners = [BANNER_DATA]; } else { banners = []; }

            window.totalBanners = banners.length;
            window.currentBannerIndex = 0;

            const carouselImagesHTML = banners.map((b, index) => `
                <img src="${b.image}" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === 0 ? 'opacity-40' : 'opacity-0'}" id="banner-slide-${index}">
            `).join('');

// --- CÓDIGO NUEVO CORREGIDO ---
            const carouselTextsHTML = banners.map((b, index) => {
                // Verificamos si hay texto para el botón. Si está vacío, no mostramos nada.
                const hasButton = b.btnText && b.btnText.trim() !== "";
                
                return `
                <div id="banner-text-${index}" class="absolute inset-0 flex flex-col justify-center px-12 md:px-24 max-w-5xl transition-all duration-700 ease-out ${index === 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}">
                    <div class="text-center md:text-left">
                        <span class="inline-block py-1 px-3 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold mb-4 border border-yellow-400/30 uppercase tracking-widest">${b.badge || 'Destacado'}</span>
                        <h2 class="text-4xl md:text-6xl xl:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">${b.title || 'TechSaul'}</h2>
                        <p class="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl drop-shadow-md mx-auto md:mx-0">${b.subtitle || ''}</p>
                        
                        ${hasButton ? `
                        <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <button onclick="window.history.pushState({}, '', '${b.btnLink || '?page=shop'}'); router.handle(true);" class="bg-yellow-400 text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95">${b.btnText} <i class="ph-bold ph-arrow-right"></i></button>
                        </div>
                        ` : ''}

                    </div>
                </div>`;
            }).join('');

            const navButtonsHTML = banners.length > 1 ? `
                <button onclick="window.moveBanner(-1)" class="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition group border border-white/10 hover:border-white/30"><i class="ph-bold ph-caret-left text-2xl md:text-3xl group-hover:text-yellow-400 transition-colors"></i></button>
                <button onclick="window.moveBanner(1)" class="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition group border border-white/10 hover:border-white/30"><i class="ph-bold ph-caret-right text-2xl md:text-3xl group-hover:text-yellow-400 transition-colors"></i></button>
            ` : '';

            container.innerHTML = `
                <div class="w-full max-w-[1920px] mx-auto px-2 md:px-4">
                    <div class="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 mb-12 min-h-[400px] md:min-h-[500px] shadow-2xl group/banner">
                        ${carouselImagesHTML}
                        <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent z-10 pointer-events-none"></div>
                        <div class="relative z-20 h-full min-h-[400px] md:min-h-[500px]">${carouselTextsHTML}</div>
                        ${navButtonsHTML}
                        ${banners.length > 1 ? `<div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">${banners.map((_, idx) => `<button onclick="window.currentBannerIndex = ${idx}-1; window.moveBanner(1)" id="indicator-${idx}" class="h-1.5 rounded-full transition-all duration-300 hover:bg-yellow-400 ${idx === 0 ? 'bg-yellow-400 w-8' : 'bg-slate-500 w-4'}"></button>`).join('')}</div>` : ''}
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition"><div class="p-3 bg-blue-50 text-blue-600 rounded-full mb-3"><i class="ph-fill ph-shield-check text-2xl"></i></div><h4 class="font-bold text-slate-900 text-sm">Garantía Oficial</h4><p class="text-xs text-slate-500 mt-1">12 Meses asegurados</p></div>
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition"><div class="p-3 bg-green-50 text-green-600 rounded-full mb-3"><i class="ph-fill ph-truck text-2xl"></i></div><h4 class="font-bold text-slate-900 text-sm">Envío Nacional</h4><p class="text-xs text-slate-500 mt-1">A todo el Perú</p></div>
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition"><div class="p-3 bg-purple-50 text-purple-600 rounded-full mb-3"><i class="ph-fill ph-credit-card text-2xl"></i></div><h4 class="font-bold text-slate-900 text-sm">Pago Seguro</h4><p class="text-xs text-slate-500 mt-1">Tarjetas y Yape</p></div>
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition"><div class="p-3 bg-orange-50 text-orange-600 rounded-full mb-3"><i class="ph-fill ph-headset text-2xl"></i></div><h4 class="font-bold text-slate-900 text-sm">Soporte 24/7</h4><p class="text-xs text-slate-500 mt-1">Siempre en línea</p></div>
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
                                <div class="flex items-center gap-2 mb-2"><span class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">Tiempo Limitado</span></div>
                                <h2 class="text-3xl font-extrabold text-slate-900">Ofertas Relámpago <i class="ph-fill ph-lightning text-yellow-400"></i></h2>
                                <p class="text-slate-500 mt-1">Aprovecha los mejores descuentos antes que se agoten.</p>
                            </div>
                            <button onclick="router.navigate('/shop', {filter: 'offers'})" class="whitespace-nowrap bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center gap-2">Ver todas las ofertas <i class="ph-bold ph-arrow-right"></i></button>
                        </div>
                        <div class="relative w-full overflow-hidden py-4">
                            <div class="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-20 pointer-events-none"></div>
                            <div class="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-20 pointer-events-none"></div>
                            <div class="animate-infinite-scroll flex gap-6 px-4">
                                ${displayOffers.map(p => `<div class="w-[260px] flex-shrink-0 transform transition hover:scale-105 duration-300">${ProductCard(p)}</div>`).join('')}
                            </div>
                        </div>
                    </div>` : ''}
                </div>`;
            
            if(banners.length > 1) {
                window.bannerInterval = setInterval(() => window.moveBanner(1), 6000);
            }
        }

     function renderShop(container, category, currentPage = 1, filterType = null, searchTerm = '') {
            let items = category ? PRODUCTS.filter(p => p.category === category) : PRODUCTS;
            if (filterType === 'offers') items = items.filter(p => p.isOffer === true);

    // Priorizamos searchTerm (URL) y si no hay, buscamos en los inputs (como respaldo)
const search = searchTerm ? searchTerm.toLowerCase() : (document.getElementById('global-search')?.value.toLowerCase() || document.getElementById('mobile-search-input')?.value.toLowerCase());
            if(search) items = items.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));
            
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

// 1. DISEÑO ESCRITORIO (Sidebar lateral)
            const catListDesktop = CATEGORIES.map(c => {
                const isSelected = category === c.name;
                const isPinned = c.isPinned;

                // Estilos Dinámicos
                let btnClass = "text-slate-600 hover:bg-slate-100"; // Normal
                let iconHTML = "";

                if (isSelected) {
                    btnClass = "bg-slate-900 text-white shadow-md";
                } else if (isPinned) {
                    // ESTILO DESTACADO PARA FIJADOS: Fondo amarillo suave, borde dorado, texto oscuro
                    btnClass = "bg-yellow-50 text-slate-800 border-l-4 border-yellow-400 font-bold shadow-sm hover:bg-yellow-100";
                    // ICONO ESTRELLA ANIMADA
                    iconHTML = `<i class="ph-fill ph-star text-yellow-500 mr-2 animate-pulse"></i>`;
                }

                return `
                <button onclick="router.navigate('/shop', {category: '${c.name}', pageNum: 1})" class="w-full text-left px-4 py-2.5 rounded-lg transition text-sm font-medium mb-1 flex justify-between items-center ${btnClass}">
                    <div class="flex items-center">${iconHTML} <span>${c.name}</span></div>
                    <i class="ph-bold ph-caret-right text-xs ${isSelected ? 'text-yellow-400' : 'text-slate-300'}"></i>
                </button>`;
            }).join('');

            // 2. DISEÑO MÓVIL (Barra horizontal superior)
            const catListMobile = CATEGORIES.map(c => {
                const isSelected = category === c.name;
                const isPinned = c.isPinned;

                let btnClass = "bg-white text-slate-600 border-slate-200"; // Normal
                let iconHTML = "";

                if (isSelected) {
                    btnClass = "bg-slate-900 text-white border-slate-900";
                } else if (isPinned) {
                    // ESTILO MÓVIL DESTACADO
                    btnClass = "bg-yellow-100 text-slate-900 border-yellow-400 font-bold shadow-sm";
                    iconHTML = `<i class="ph-fill ph-star text-yellow-600 mr-1 animate-pulse"></i>`;
                }

                return `
                <button onclick="router.navigate('/shop', {category: '${c.name}', pageNum: 1})" class="whitespace-nowrap px-4 py-2 rounded-full border text-sm font-bold transition flex-shrink-0 flex items-center ${btnClass}">
                    ${iconHTML} ${c.name}
                </button>`;
            }).join('');
            
            let paginationHTML = '';
            if (totalPages > 1) {
                paginationHTML = `<div class="flex flex-wrap justify-center items-center gap-2 mt-12 pt-8 border-t border-slate-200">`;
                if (currentPage > 1) paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${currentPage - 1}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"><i class="ph-bold ph-caret-left"></i></button>`;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);
                if (startPage > 1) { paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: 1})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-sm font-bold transition">1</button>`; if (startPage > 2) paginationHTML += `<span class="text-slate-400 px-1">...</span>`; }
                for (let i = startPage; i <= endPage; i++) { const isActive = i === currentPage; paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${i}})" class="w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold transition ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">${i}</button>`; }
                if (endPage < totalPages) { if (endPage < totalPages - 1) paginationHTML += `<span class="text-slate-400 px-1">...</span>`; paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${totalPages}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-sm font-bold transition">${totalPages}</button>`; }
                if (currentPage < totalPages) paginationHTML += `<button onclick="router.navigate('/shop', {category: '${category || ''}', pageNum: ${currentPage + 1}})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"><i class="ph-bold ph-caret-right"></i></button>`;
                paginationHTML += `</div><div class="text-center mt-4 text-xs text-slate-400">Página ${currentPage} de ${totalPages}</div>`;
            }

            container.innerHTML = `
                <div class="w-full max-w-[1920px] mx-auto px-2 md:px-4">
                    <div class="mb-8 py-10 px-6 bg-slate-100 rounded-3xl text-center relative overflow-hidden">
                        <div class="relative z-10"><h1 class="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2">${category ? category : (filterType === 'offers' ? 'Ofertas Disponibles' : 'Catálogo Completo')}</h1><p class="text-slate-500 text-sm md:text-base font-medium">Mostrando ${paginatedItems.length} de ${totalItems} productos disponibles</p></div>
                        <i class="ph-fill ph-storefront absolute -bottom-6 -right-6 text-slate-200 text-9xl transform -rotate-12"></i>
                    </div>
                    <div class="flex flex-col lg:flex-row gap-8 items-start mb-12">
                        <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-24">
                            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                                <h3 class="font-bold text-slate-900 mb-4 px-2 text-lg border-b border-slate-100 pb-2">Categorías</h3>
                                <nav class="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                                    <button onclick="router.navigate('/shop', {pageNum: 1})" class="w-full text-left px-4 py-2.5 rounded-lg transition text-sm font-medium mb-1 flex justify-between items-center ${!category ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}"><span>Todas</span><i class="ph-bold ph-caret-right text-xs ${!category ? 'text-yellow-400' : 'text-slate-300'}"></i></button>
                                    ${catListDesktop}
                                </nav>
                            </div>
                        </aside>
                        <div class="flex-1 w-full">
                            <div class="lg:hidden flex overflow-x-auto gap-2 pb-4 mb-4 no-scrollbar"><button onclick="router.navigate('/shop', {pageNum: 1})" class="whitespace-nowrap px-4 py-2 rounded-full border text-sm font-bold transition flex-shrink-0 ${!category ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}">Todas</button>${catListMobile}</div>
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
                similarHTML = `<div class="mt-16 border-t border-slate-200 pt-12"><div class="mb-8 px-2"><h3 class="text-2xl font-bold text-slate-900 mb-1">Productos Similares</h3><p class="text-slate-500 text-sm">Quienes vieron esto también compraron</p></div><div class="relative w-full overflow-hidden py-4"><div class="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f8fafc] to-transparent z-20 pointer-events-none"></div><div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f8fafc] to-transparent z-20 pointer-events-none"></div><div class="animate-infinite-scroll flex gap-6 px-4">${displaySimilar.map(sim => `<div class="w-[280px] md:w-[300px] flex-shrink-0 transform transition hover:scale-105 duration-300 overflow-hidden">${ProductCard(sim)}</div>`).join('')}</div></div></div>`;
            }

            const rating = p.rating ? parseFloat(p.rating).toFixed(1) : "0.0";
            const reviewsCount = p.reviewCount || 0;
            const stock = p.stock || 0;
            const isStock = stock > 0;
            const isFav = state.favorites.has(p.id);
            const allImages = [p.image, ...(p.gallery || [])];
// CREAR BOTON DE VIDEO (DISEÑO SHOPIFY PRO - DESLIZAMIENTO VERTICAL)
let videoBtn = '';
if (p.hasVideo && p.videoUrl) {
    videoBtn = `<button onclick="openVideoModal('${p.videoUrl}')" class="group mt-4 mx-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-bold shadow-sm flex items-center justify-center gap-3 transition-colors duration-300 border border-slate-800">
        
        <div class="relative w-5 h-5 overflow-hidden">
            <div class="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-full">
                <i class="ph-fill ph-youtube-logo text-lg text-red-500"></i>
            </div>
            
            <div class="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out translate-y-full group-hover:translate-y-0">
                <i class="ph-fill ph-play text-lg text-white"></i>
            </div>
        </div>

        <span class="text-[10px] tracking-[0.2em] uppercase pt-0.5">Ver Review</span>
    </button>`;
}
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

 // --- INICIO CÓDIGO NUEVO PARA VALIDAR COMPRA ---
            let reviewFormHTML = '';
            
            if (!state.user) {
                // Caso 1: No logueado
                reviewFormHTML = `<div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 text-center"><p class="text-blue-800 font-medium mb-3">Inicia sesión para compartir tu opinión</p><button onclick="router.navigate('/login')" class="bg-white text-slate-900 text-sm font-bold px-6 py-2 rounded-full border border-slate-200 hover:bg-slate-50">Ir al Login</button></div>`;
            } else {
                // Caso 2: Logueado. Verificamos si compró y si está Aprobado.
                const hasPurchased = state.orders.some(order => 
                    order.status === 'Aprobado' && 
                    order.items && 
                    order.items.some(item => item.id === p.id)
                );

                if (hasPurchased) {
                    // Si compró: Muestra el formulario
                    reviewFormHTML = `
                    <div class="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
                        <h4 class="font-bold text-slate-900 mb-4">Escribe tu opinión</h4>
                        <div class="flex gap-2 mb-4 text-2xl cursor-pointer" id="star-selector"><i onclick="reviewManager.setRating(1)" id="star-form-1" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i><i onclick="reviewManager.setRating(2)" id="star-form-2" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i><i onclick="reviewManager.setRating(3)" id="star-form-3" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i><i onclick="reviewManager.setRating(4)" id="star-form-4" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i><i onclick="reviewManager.setRating(5)" id="star-form-5" class="ph-bold ph-star text-slate-300 hover:text-yellow-400 transition"></i></div>
                        <textarea id="review-comment" class="w-full p-3 rounded-xl border border-slate-200 mb-4 focus:border-yellow-400 outline-none text-sm bg-slate-50" rows="3" placeholder="¿Qué te pareció el producto?"></textarea>
                        <button onclick="reviewManager.submitReview('${p.id}')" class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition">Publicar Reseña</button>
                    </div>`;
                } else {
                    // Si NO compró o no está aprobado: Muestra aviso
                    reviewFormHTML = `<div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 text-center opacity-75"><i class="ph-bold ph-lock-key text-2xl text-slate-400 mb-2"></i><p class="text-slate-600 text-sm font-medium">Solo los clientes que han comprado y validado este producto pueden dejar una reseña.</p></div>`;
                }
            }
            // --- FIN CÓDIGO NUEVO ---


            container.innerHTML = `
                <div class="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-12">
                    <button onclick="window.history.back()" class="mb-8 flex items-center text-slate-500 hover:text-slate-900 font-medium transition"><i class="ph-bold ph-arrow-left mr-2"></i> Volver a la tienda</button>
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-12">
                        <div class="lg:col-span-7">
<div id="zoom-container" class="rounded-3xl p-8 flex flex-col items-center justify-center border border-slate-100 shadow-lg min-h-[400px] relative zoom-container group bg-slate-50" style="background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(to right, #e2e8f0 1px, transparent 1px); background-size: 40px 40px;">
    <img id="main-product-img" src="${p.image}" class="zoom-img w-full max-h-[500px] object-contain drop-shadow-2xl ${!isStock ? 'grayscale opacity-50' : ''}">
                              
                                <div class="absolute top-6 right-6 pointer-events-none"><button onclick="userActions.toggleFavorite('${p.id}')" class="pointer-events-auto p-4 rounded-full border transition-all shadow-sm ${isFav ? "bg-red-50 text-red-500 border-red-200" : "bg-white text-slate-400 border-slate-200 hover:border-red-200 hover:text-red-500"}"><i class="${isFav ? 'ph-fill' : 'ph-bold'} ph-heart text-2xl"></i></button></div>
                                ${!isStock ? '<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><span class="bg-slate-900 text-white text-xl font-bold px-6 py-3 rounded-full shadow-2xl transform -rotate-12">AGOTADO</span></div>' : ''}
                            </div>
                            ${videoBtn}
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
    ${p.isOffer && p.offerPrice ? `<span class="text-sm text-slate-400 line-through mb-1">Antes: S/ ${p.price.toFixed(2)}</span>` : ''}
    <span class="text-4xl font-bold ${p.isOffer ? 'text-red-600' : 'text-slate-900'} tracking-tight">S/ ${(p.isOffer && p.offerPrice ? p.offerPrice : p.price).toFixed(2)}</span>
    ${p.points ? `<span class="mt-2 inline-flex items-center gap-1 text-sm font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg w-fit border border-yellow-200"><i class="ph-fill ph-star text-yellow-500"></i> Ganas +${p.points} Puntos</span>` : ''}
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
                const progress = Math.min((state.points / 100) * 100, 100);
                contentHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden col-span-1 lg:col-span-2">
                        <div class="absolute right-0 top-0 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                        <div class="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h3 class="text-yellow-400 font-bold uppercase tracking-widest text-xs mb-1">Club TechSaul Rewards</h3>
                                <div class="text-5xl font-extrabold mb-1">${state.points} <span class="text-xl font-medium text-slate-400">Pts</span></div>
                                <div class="text-sm text-slate-400 mb-4">Equivale a progreso para tu siguiente recompensa.</div>
                                <div class="w-full md:w-64 h-3 bg-slate-800 rounded-full overflow-hidden mb-2 border border-slate-700">
                                    <div class="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-1000" style="width: ${progress}%"></div>
                                </div>
                                <div class="text-xs text-slate-500 font-bold">${state.points} / 100 para canjear S/ 10.00</div>
                            </div>
                            <div class="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 min-w-[200px] text-center">
                                <div class="text-xs text-slate-300 font-bold uppercase mb-2">Tu Saldo Monedero</div>
                                <div class="text-3xl font-bold text-white mb-4">S/ ${state.wallet.toFixed(2)}</div>
                                <button onclick="userActions.redeemPoints()" class="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-2 rounded-lg text-sm transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" ${state.points < 100 ? 'disabled' : ''}>${state.points >= 100 ? 'Canjear Puntos' : 'Faltan Puntos'}</button>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div class="p-4 bg-blue-50 text-blue-600 rounded-xl"><i class="ph-bold ph-package text-3xl"></i></div>
                        <div><div class="text-2xl font-bold text-slate-900">${state.orders.length}</div><div class="text-sm text-slate-500 font-medium">Pedidos Realizados</div></div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div class="p-4 bg-red-50 text-red-600 rounded-xl"><i class="ph-bold ph-heart text-3xl"></i></div>
                        <div><div class="text-2xl font-bold text-slate-900">${state.favorites.size}</div><div class="text-sm text-slate-500 font-medium">Favoritos Guardados</div></div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                    <h3 class="font-bold text-xl mb-6 flex items-center gap-2"><i class="ph-bold ph-user-circle"></i> Información Personal</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100"><label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</label><div class="font-bold text-slate-800 text-lg mt-1">${userName}</div></div>
                        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100"><label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label><div class="font-bold text-slate-800 text-lg mt-1">${userEmail}</div></div>
                    </div>
                </div>`;


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
                        
   // Lógica para mostrar botón de calificar o ver detalles
                        let actionButtons = '';
                        if (o.status === 'Aprobado') {
                            actionButtons = `
                            <div class="flex flex-col gap-2 w-full md:w-auto">
                                <span class="text-2xl font-bold text-slate-900 text-right">S/ ${o.total.toFixed(2)}</span>
                                <button onclick="userActions.showOrderDetails('${o.id}')" class="text-xs bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-6 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-md shadow-yellow-400/20 transform hover:-translate-y-0.5">
                                    <i class="ph-fill ph-star"></i> Calificar / Detalles
                                </button>
                            </div>`;
                        } else {
                            actionButtons = `
                            <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                                <span class="text-2xl font-bold text-slate-900">S/ ${o.total.toFixed(2)}</span>
                                <button onclick="userActions.showOrderDetails('${o.id}')" class="text-sm bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2">
                                    <i class="ph-bold ph-eye"></i> Ver Detalles
                                </button>
                            </div>`;
                        }

                        return `<div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-yellow-400 transition-colors duration-300">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="font-bold text-lg text-slate-900">Pedido #${o.id ? o.id.slice(-6) : (Date.now()-idx).toString().slice(-6)}</span>
                                    <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">${o.status}</span>
                                </div>
                                <div class="text-sm text-slate-500 mb-2"><i class="ph-bold ph-calendar-blank mr-1"></i> ${new Date(o.date).toLocaleDateString()} · ${new Date(o.date).toLocaleTimeString()}</div>
                                <div class="text-sm text-slate-700 font-medium">${o.items ? o.items.length : 0} productos</div>
                                ${timerHTML}
                            </div>
                            ${actionButtons}
                        </div>`;
                  
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
                            <h2 class="text-5xl font-bold leading-tight mb-6">Tu tienda virtual de confianza y a un buen precio.</h2>
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
                                        <button type="button" onclick="togglePass()" class="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-900 transition z-10"><i id="pass-icon" class="ph-bold ph-eye-slash text-xl"></i></button>
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

        // --- LÓGICA DEL BANNER DE PUNTOS (SIEMPRE APARECE) ---
        window.closePointsBanner = () => {
            const b = document.getElementById('points-promo-banner');
            if(b) {
                b.classList.add('translate-y-full'); 
            }
        };

        setTimeout(() => {
            const b = document.getElementById('points-promo-banner');
            if(b) {
                b.classList.remove('translate-y-full'); 
            }
        }, 3000);

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


       // --- LÓGICA DE BUSCADOR EN VIVO ---
        const setupSearch = () => {
            const input = document.getElementById('global-search');
            const results = document.getElementById('search-results');
            
            if(!input || !results) return;

            // 1. Evento al Escribir (Live Search)
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                
                // Si borra todo, ocultamos resultados
                if(term.length < 1) {
                    results.classList.add('hidden');
                    return;
                }

                // Filtramos productos (Nombre o Categoría)
                const matches = PRODUCTS.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.category.toLowerCase().includes(term)
                ).slice(0, 5); // Mostramos máximo 5

                if(matches.length === 0) {
                    results.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs font-bold">No encontramos coincidencias</div>`;
                } else {
                    results.innerHTML = matches.map(p => `
                        <div onclick="router.navigate('product', {product: '${p.slug}'}); document.getElementById('global-search').value = ''; document.getElementById('search-results').classList.add('hidden');" class="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition group">
                            <img src="${p.image}" class="w-10 h-10 object-cover rounded-lg border border-slate-100 group-hover:scale-105 transition">
                            <div class="flex-1 min-w-0">
                                <h4 class="text-sm font-bold text-slate-800 truncate">${p.name}</h4>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-100 px-1.5 rounded">${p.category}</span>
                                    <span class="text-xs font-bold text-slate-900">S/ ${p.isOffer ? p.offerPrice : p.price}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') + `<div onclick="router.navigate('shop', {search: '${term}'}); document.getElementById('global-search').value = ''; document.getElementById('search-results').classList.add('hidden');" class="p-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer bg-slate-50 transition border-t border-slate-100">Ver todos los resultados <i class="ph-bold ph-arrow-right"></i></div>`;
                }
                results.classList.remove('hidden');
            });

            // 2. Evento Enter (Ir a la tienda y borrar texto)
            input.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    const term = input.value.trim();
                    if(term) {
                        router.navigate('shop', { search: term }); // Enviamos búsqueda por URL
                        input.value = ''; // Borramos texto visualmente
                        results.classList.add('hidden'); // Ocultamos lista
                        input.blur(); // Quitamos foco
                    }
                }
            });

            // 3. Ocultar al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !results.contains(e.target)) {
                    results.classList.add('hidden');
                }
            });
        };

        // Inicializar buscador
        setupSearch();


        });




    (function initUbigeoSimple() {
        const deptSelect = document.getElementById('bill-dept');
        
        // Lista simple de Departamentos
        const departamentos = [
            "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", 
            "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", 
            "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", 
            "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", 
            "Tumbes", "Ucayali"
        ];

        // Llenar el select automáticamente
        deptSelect.innerHTML = '<option value="">Seleccione Departamento</option>';
        departamentos.forEach(dept => {
            deptSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
    })();

