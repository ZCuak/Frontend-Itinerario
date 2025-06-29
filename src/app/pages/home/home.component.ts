import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { DropdownModule } from 'primeng/dropdown';
import { ChatService } from '../../services/chat.service';
import { CiudadService, Ciudad, GrupoCiudades } from '../../services/ciudad.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { FilterService } from 'primeng/api';
import { CarouselModule } from 'primeng/carousel';
import { delay, timer } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { ItinerarioDetalladoComponent } from '../../components/itinerario-detallado/itinerario-detallado.component';
import { Actividad, LugarComida, CostoTransporte, Recomendacion } from '../../interfaces/recomendaciones.interface';
import { FormattersUtil } from '../../utils/formatters.util';
import { MessageProcessorUtil } from '../../utils/message-processor.util';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { EstadoService } from '../../services/estado.service';

// Importar la interfaz Itinerario del componente ItinerarioDetallado
import { Itinerario } from '../../components/itinerario-detallado/itinerario-detallado.component';

interface Lugar {
  nombre: string;
  ciudad: string;
  pais: string;
}

interface LugarRecomendado {
  nombre: string;
  ciudad: string;
  pais: string;
  descripcion: string;
  tipo: string;
  costoAproximado: string;
  horario: string;
  ubicacion: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    DividerModule,
    AnimateOnScrollModule,
    AutoCompleteModule,
    CarouselModule,
    FooterComponent,
    SelectModule,
    ItinerarioDetalladoComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  title = 'Bienvenido a Itinerario App AI';
  mensaje: string = '';
  presupuesto: number = 0;
  diasViaje: number = 1;
  fechaSalida: Date = new Date();
  fechaMinima: Date = new Date();
  lugarSalida: string = '';
  destinosDeseados: string = '';
  mensajes: { texto: string; esUsuario: boolean; fecha?: Date }[] = [];
  historialConversacion: { role: string; content: string }[] = [];
  recomendaciones: Recomendacion[] = [];
  itinerarios: Itinerario[] = [];

  // Estados de la guía
  pasoActual: number = 1;
  pasosCompletados: boolean[] = [false, false, false, false, false];
  mostrarChat: boolean = false;

  // Opciones de moneda
  monedas = [
    { label: 'Soles (S/)', value: 'PEN' },
    { label: 'Dólares ($)', value: 'USD' },
    { label: 'Euros (€)', value: 'EUR' }
  ];
  monedaSeleccionada = this.monedas[0];

  // Mensajes de guía
  mensajesGuia = [
    "¿Cuál es tu presupuesto para el viaje?",
    "¿Cuántos días planeas viajar?",
    "¿Cuándo te gustaría comenzar tu viaje?",
    "¿Desde dónde partirás tu viaje?",
    "¿Qué destinos te gustaría visitar?"
  ];

  estaEscribiendo: boolean = false;

  selectedCity: any = null;
  filteredGroups: GrupoCiudades[] = [];
  groupedCities: GrupoCiudades[] = [];

  selectedDestinos: any[] = [];
  filteredDestinos: GrupoCiudades[] = [];
  groupedDestinos: GrupoCiudades[] = [];

  // Opciones responsivas para el carrusel
  responsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  preferenciasUsuario: string[] = [];

  // Formulario principal
  miForm!: FormGroup;

  private estadosPorCiudad: Map<string, string> = new Map();

  constructor(
    private chatService: ChatService,
    private ciudadService: CiudadService,
    private estadoService: EstadoService,
    private filterService: FilterService,
    private fb: FormBuilder
  ) {
    // Establecer la hora a 00:00:00 para la fecha mínima
    this.fechaMinima.setHours(0, 0, 0, 0);
  }

  ngOnInit() {
    this.cargarCiudadesPeru();
    this.inicializarFormulario();
  }

  inicializarFormulario() {
    this.miForm = this.fb.group({
      presupuesto: [0, [Validators.required, Validators.min(this.getPresupuestoMinimo())]],
      moneda: [this.monedas[0], [Validators.required]],
      diasViaje: [1, [Validators.required, Validators.min(1), Validators.max(7)]],
      fechaSalida: [new Date(), [Validators.required]],
      lugarSalida: [null, [Validators.required]],
      destinos: [[], []],
      mensaje: ['', []]
    });
  }

  cargarCiudadesPeru() {
    this.ciudadService.getCiudadesPorPais('Peru').subscribe(
      (ciudades) => {

        if (!Array.isArray(ciudades) || ciudades.length === 0) {
          console.error('No se recibieron ciudades válidas');
          return;
        }

        // Crear un solo grupo para todas las ciudades
        this.groupedCities = [{
          label: 'Perú',
          value: 'pe',
          items: ciudades.map(ciudad => ({
            label: ciudad.name,
            value: ciudad.name
          }))
        }];
        // Preparar los destinos con el mismo formato
        this.groupedDestinos = [{
          label: 'Perú',
          value: 'pe',
          items: ciudades.map(ciudad => ({
            label: ciudad.name,
            value: ciudad.name
          }))
        }];
      },
      (error) => {
        console.error('Error al cargar ciudades:', error);
      }
    );
  }

  filterGroupedCity(event: AutoCompleteCompleteEvent) {
    let query = event.query;

    let filteredGroups: GrupoCiudades[] = [];

    for (let optgroup of this.groupedCities) {
      let filteredSubOptions = this.filterService.filter(optgroup.items, ['label'], query, "contains");

      if (filteredSubOptions && filteredSubOptions.length) {
        filteredGroups.push({
          label: optgroup.label,
          value: optgroup.value,
          items: filteredSubOptions
        });
      }
    }
    this.filteredGroups = filteredGroups;
  }

  siguientePaso() {
    if (this.pasoActual < 5) {
      this.pasosCompletados[this.pasoActual - 1] = true;
      this.pasoActual++;
    } else {
      this.mostrarChat = true;
      const moneda = this.miForm.get('moneda')?.value.label.split(' ')[0];
      const diasTexto = this.miForm.get('diasViaje')?.value === 1 ? 'día' : 'días';
      const lugarSalidaTexto = this.miForm.get('lugarSalida')?.value ? `, saliendo desde ${this.miForm.get('lugarSalida')?.value}` : '';
      const destinos = this.miForm.get('destinos')?.value || [];
      const destinosTexto = destinos.length > 0
        ? ` y con interés en visitar ${destinos.length > 1
          ? destinos.slice(0, -1).join(', ') + ' y ' + destinos[destinos.length - 1]
          : destinos[0]}`
        : '';
      const mensajeInicial = `¡Perfecto! Con tu presupuesto de ${this.miForm.get('presupuesto')?.value} ${moneda}, ${this.miForm.get('diasViaje')?.value} ${diasTexto} de viaje${lugarSalidaTexto}${destinosTexto} podemos crear un itinerario personalizado. ¿Qué tipo de experiencias te gustaría vivir durante tu viaje? ¿Prefieres actividades culturales, aventura, gastronomía o una mezcla de todo?`;

      this.mensajes.push({
        texto: mensajeInicial,
        esUsuario: false
      });
    }
  }

  private extraerJSONDeRespuesta(respuesta: string): any {
    try {
      // Buscar el contenido entre ```json y ```
      const match = respuesta.match(/```json\n([\s\S]*?)\n```/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      // Si no encuentra el formato markdown, intentar parsear directamente
      return JSON.parse(respuesta);
    } catch (error) {
      console.error('Error al extraer JSON:', error);
      throw new Error('No se pudo procesar la respuesta de la API');
    }
  }

  private normalizarTexto(texto: string): string {
    return texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita acentos
      .toLowerCase(); // Convierte a minúsculas
  }

  async enviarMensaje() {
    const mensaje = this.miForm.get('mensaje')?.value;
    if (!mensaje?.trim()) return;

    console.log('=== INICIO DEL PROCESO DE ENVÍO DE MENSAJE ===');
    console.log('Mensaje del usuario:', mensaje);

    // Procesar preferencias del mensaje
    const preferencias = MessageProcessorUtil.procesarPreferencias(mensaje);
    this.preferenciasUsuario = [...new Set([...this.preferenciasUsuario, ...preferencias])];
    console.log('Preferencias procesadas:', this.preferenciasUsuario);

    // Agregar mensaje del usuario
    this.mensajes.push({
      texto: mensaje,
      esUsuario: true,
      fecha: new Date()
    });

    try {
      // Paso 1: Obtener estados para las ciudades seleccionadas
      console.log('\n=== PASO 1: OBTENCIÓN DE ESTADOS ===');
      const destinos = this.miForm.get('destinos')?.value || [];
      const lugarSalida = this.miForm.get('lugarSalida')?.value;
      const diasViaje = this.miForm.get('diasViaje')?.value;

      // Obtener estado para el lugar de salida
      if (lugarSalida) {
        const estadoSalida = await this.estadoService.obtenerEstadoPorCiudad(lugarSalida, 'Peru').toPromise();
        if (estadoSalida?.status === 'success') {
          this.estadosPorCiudad.set(lugarSalida, estadoSalida.data.nombre);
        }
      }

      // Obtener estados para los destinos
      for (const destino of destinos) {
        const estadoDestino = await this.estadoService.obtenerEstadoPorCiudad(destino, 'Peru').toPromise();
        if (estadoDestino?.status === 'success') {
          this.estadosPorCiudad.set(destino, estadoDestino.data.nombre);
        }
      }

      console.log('Estados obtenidos:', Object.fromEntries(this.estadosPorCiudad));

      // Paso 2: Obtener lugares recomendados
      console.log('\n=== PASO 2: OBTENCIÓN DE LUGARES RECOMENDADOS ===');
      console.log('Datos del formulario:', {
        presupuesto: this.miForm.get('presupuesto')?.value,
        moneda: this.miForm.get('moneda')?.value,
        diasViaje: diasViaje,
        fechaSalida: this.miForm.get('fechaSalida')?.value,
        lugarSalida: this.miForm.get('lugarSalida')?.value,
        destinos: this.miForm.get('destinos')?.value,
        estados: Object.fromEntries(this.estadosPorCiudad)
      });

      const promptLugares = MessageProcessorUtil.generarPromptLugares(
        mensaje,
        this.miForm.get('presupuesto')?.value,
        diasViaje,
        this.miForm.get('fechaSalida')?.value,
        this.miForm.get('lugarSalida')?.value,
        this.miForm.get('destinos')?.value || [],
        this.preferenciasUsuario,
        this.miForm.get('moneda')?.value.value,
        Object.fromEntries(this.estadosPorCiudad)
      );

      console.log('Prompt enviado a DeepSeek para lugares:', promptLugares);
      const respuestaLugares = await this.chatService.enviarMensaje(promptLugares).toPromise();
      console.log('Respuesta completa de DeepSeek para lugares:', respuestaLugares);

      // Extraer el JSON de la respuesta
      const lugares = this.extraerJSONDeRespuesta(respuestaLugares.data);
      console.log('Lugares extraídos y procesados:', lugares);

      // Agregar mensaje inicial con los lugares recomendados
      this.mensajes.push({
        texto: lugares.mensaje,
        esUsuario: false,
        fecha: new Date()
      });

      // Paso 3: Obtener clima solo si el viaje es de 3 días o menos
      let climaPorCiudad = new Map();
      if (diasViaje <= 3) {
        console.log('\n=== PASO 3: OBTENCIÓN DEL CLIMA ===');

        // Crear un mapa de ciudades únicas
        const ciudadesUnicas = new Map<string, { ciudad: string; pais: string }>();
        lugares.lugares.forEach((lugar: LugarRecomendado) => {
          const ciudadNormalizada = this.normalizarTexto(lugar.ciudad);
          const paisNormalizado = this.normalizarTexto(lugar.pais);
          const key = `${ciudadNormalizada}-${paisNormalizado}`;
          if (!ciudadesUnicas.has(key)) {
            ciudadesUnicas.set(key, { ciudad: ciudadNormalizada, pais: paisNormalizado });
          }
        });

        console.log('Ciudades únicas para consultar clima:', Array.from(ciudadesUnicas.values()));

        // Consultar clima solo para ciudades únicas
        const promesasClima = Array.from(ciudadesUnicas.values()).map(({ ciudad, pais }) => {
          console.log(`Preparando consulta de clima para: ${ciudad}, ${pais}`);
          return this.chatService.obtenerClima(ciudad, pais).toPromise();
        });

        const climas = await Promise.all(promesasClima);
        console.log('Respuestas de la API de clima:', climas);

        // Crear un mapa de clima por ciudad
        Array.from(ciudadesUnicas.values()).forEach(({ ciudad, pais }, index) => {
          const key = `${ciudad}-${pais}`;
          climaPorCiudad.set(key, climas[index]);
        });
      } else {
        console.log('\n=== PASO 3: OBTENCIÓN DEL CLIMA (OMITIDO) ===');
        console.log('El viaje dura más de 3 días, no se consultará el clima');
      }

      // Paso 4: Generar itinerario con información del clima
      console.log('\n=== PASO 4: GENERACIÓN DE ITINERARIO ===');
      const promptItinerario = MessageProcessorUtil.generarPromptItinerario(
        mensaje,
        this.miForm.get('presupuesto')?.value,
        diasViaje,
        this.miForm.get('fechaSalida')?.value,
        this.miForm.get('lugarSalida')?.value,
        this.miForm.get('destinos')?.value || [],
        this.preferenciasUsuario,
        this.miForm.get('moneda')?.value.value,
        lugares.lugares,
        Array.from(climaPorCiudad.values()),
        Object.fromEntries(this.estadosPorCiudad),
        diasViaje <= 3
      );

      console.log('Prompt enviado a DeepSeek para itinerario:', promptItinerario);
      const respuestaItinerario = await this.chatService.enviarMensaje(promptItinerario).toPromise();
      console.log('Respuesta completa de DeepSeek para itinerario:', respuestaItinerario);

      // Extraer el JSON de la respuesta del itinerario
      const itinerario = this.extraerJSONDeRespuesta(respuestaItinerario.data);
      console.log('Itinerario extraído y procesado:', itinerario);

      // Actualizar el itinerario
      this.itinerarios = itinerario.itinerarios;

      // Agregar respuesta del asistente con el itinerario y consideraciones del clima
      this.mensajes.push({
        texto: itinerario.mensaje,
        esUsuario: false,
        fecha: new Date()
      });

      // Actualizar recomendaciones
      if (itinerario.recomendaciones) {
        this.recomendaciones = itinerario.recomendaciones;
        console.log('Recomendaciones actualizadas:', this.recomendaciones);
      }

      console.log('\n=== FIN DEL PROCESO DE ENVÍO DE MENSAJE ===');

      // Limpiar el input
      this.miForm.get('mensaje')?.setValue('');
    } catch (error: any) {
      console.error('Error al procesar el mensaje:', error);
      console.error('Detalles del error:', {
        mensaje: error.message,
        stack: error.stack
      });
      this.mensajes.push({
        texto: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        esUsuario: false,
        fecha: new Date()
      });
    }
  }

  esPasoCompletado(paso: number): boolean {
    return this.pasosCompletados[paso - 1];
  }

  getPresupuestoMinimo(): number {
    return this.monedaSeleccionada.value === 'PEN' ? 100 : 30;
  }

  esFechaValida(): boolean {
    return this.fechaSalida >= this.fechaMinima;
  }

  getDiasTexto(): string {
    return this.diasViaje === 1 ? 'día' : 'días';
  }

  searchDestinos(event: AutoCompleteCompleteEvent) {
    let query = event.query;
    if (!query) {
      this.filteredDestinos = [];
      return;
    }

    let filteredGroups: GrupoCiudades[] = [];

    for (let optgroup of this.groupedDestinos) {
      let filteredSubOptions = this.filterService.filter(optgroup.items, ['label'], query, "contains");
      if (filteredSubOptions && filteredSubOptions.length) {
        filteredGroups.push({
          label: optgroup.label,
          value: optgroup.value,
          items: filteredSubOptions
        });
      }
    }

    this.filteredDestinos = filteredGroups;
  }


  onUnselectDestino(event: any) {
    this.selectedDestinos = this.selectedDestinos.filter(destino => destino !== event.query);
  }

}
