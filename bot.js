require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  Options,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log("Bot está en línea y listo para funcionar.");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!carta")) {
    const content = message.content
      .slice(7)
      .trim()
      .replace(/"/g, "")
      .toLowerCase();

    console.log(`Buscando cartas del Pokémon: "${content}"`);

    try {
      // Realiza la solicitud HTTP para obtener el JSON desde la URL
      const response = await axios.get(
        "https://raw.githubusercontent.com/iSMP14/pokemon-tcg-pocket-cardss/refs/heads/main/v1.json"
      );
      const cartas = response.data;

      // Filtra las cartas que coincidan con el nombre base del Pokémon
      const cartasEncontradas = cartas.filter((carta) =>
        carta.name.toLowerCase().includes(content)
      );

      if (cartasEncontradas.length === 0) {
        message.channel.send(
          "No se encontraron cartas con ese nombre de Pokémon."
        );
        return;
      }

      // Toma la carta base (por ejemplo, la primera o "Common")
      const cartaBase =
        cartasEncontradas.find(
          (carta) => carta.rarity.toLowerCase() === "common"
        ) || cartasEncontradas[0];
      const rarezasUnicas = [
        ...new Set(cartasEncontradas.map((carta) => carta.rarity)),
      ];

      // Crea un embed con la carta base
      const embed = new EmbedBuilder()
        .setTitle(`Carta: ${cartaBase.name}`)
        .setDescription(
          `
**Rareza**: ${cartaBase.rarity}
**Paquete**: ${cartaBase.pack}
**Tipo**: ${cartaBase.type}
**Salud**: ${cartaBase.health}
**Etapa**: ${cartaBase.stage}
**Costo de creación**: ${cartaBase.craftingCost}`
        )
        .setImage(cartaBase.image);

      // Crea un menú desplegable con las rarezas disponibles
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select-rarity")
        .setPlaceholder("Selecciona una rareza")
        .addOptions(
          rarezasUnicas.map((rarity) => ({
            label: rarity,
            value: rarity.toLowerCase(),
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Envía el embed con el menú desplegable
      const sentMessage = await message.channel.send({
        embeds: [embed],
        components: [row],
      });

      // Espera la interacción del usuario con un límite de tiempo
      const filter = (interaction) =>
        interaction.customId === "select-rarity" &&
        interaction.user.id === message.author.id;
      const collector = sentMessage.createMessageComponentCollector({
        filter,
        time: 60000,
      }); // 60 segundos

      collector.on("collect", async (interaction) => {
        const selectedRarity = interaction.values[0].toLowerCase().trim();
        const content = interaction.message.embeds[0].title
          .split(": ")[1]
          .toLowerCase()
          .trim();

        console.log(
          `Buscando carta con nombre: "${content}" y rareza: "${selectedRarity}"`
        );

        try {
          // Realiza la solicitud HTTP para obtener el JSON desde la URL
          const response = await axios.get(
            "https://raw.githubusercontent.com/iSMP14/pokemon-tcg-pocket-cardss/refs/heads/main/v1.json"
          );
          const cartas = response.data;

          // Filtra la carta específica por nombre y rareza de manera más flexible
          const cartaSeleccionada = cartas.find(
            (carta) =>
              carta.name.toLowerCase().includes(content) &&
              carta.rarity.toLowerCase().trim() === selectedRarity
          );

          console.log("Carta seleccionada:", cartaSeleccionada); // Debug

          if (cartaSeleccionada) {
            const embed = new EmbedBuilder()
              .setTitle(`Carta: ${cartaSeleccionada.name}`)
              .setDescription(
                `
**Rareza**: ${cartaSeleccionada.rarity}
**Paquete**: ${cartaSeleccionada.pack}
**Tipo**: ${cartaSeleccionada.type}
**Salud**: ${cartaSeleccionada.health}
**Etapa**: ${cartaSeleccionada.stage}
**Costo de creación**: ${cartaSeleccionada.craftingCost}`
              )
              .setImage(cartaSeleccionada.image);

            await interaction.update({ embeds: [embed] });
          } else {
            console.log(
              `No se encontró la carta con nombre: "${content}" y rareza: "${selectedRarity}"`
            );
            await interaction.reply({
              content: "No se encontró la carta seleccionada.",
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error("Error al manejar la interacción:", error);
          await interaction.reply({
            content: "Hubo un error al buscar la carta seleccionada.",
            ephemeral: true,
          });
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            "El tiempo para seleccionar una rareza ha expirado."
          );
        }
      });
    } catch (error) {
      console.error("Error al buscar las cartas:", error);
      message.channel.send("Hubo un error al buscar las cartas.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
