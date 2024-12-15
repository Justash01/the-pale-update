import { system, ItemStack, Player, BlockComponentPlayerInteractEvent, ItemDurabilityComponent, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, world, ItemComponentTypes, Direction, WorldInitializeAfterEvent, WorldInitializeBeforeEvent, EntityInventoryComponent } from "@minecraft/server";

/**
 * Damages an item in a player's inventory.
 * @param player The player
 * @param slot The slot of the item
 */
function damage_item(player: Player, slot: number) {
  if (player.getGameMode() !== GameMode.creative) {
    const inventory = player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent;
    const itemStack = inventory?.container?.getItem(slot);
    if (!itemStack) return;

    const durabilityComp = itemStack.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
    system.run(() => {
      if (durabilityComp) {
        durabilityComp.damage += 1;
        if (durabilityComp.damage == durabilityComp.maxDurability) {
          inventory?.container?.setItem(slot, new ItemStack("minecraft:air", 1));
          player.playSound("random.break");
          return;
        }
        inventory?.container?.setItem(slot, itemStack);
      }
    });
  }
};

world.beforeEvents.worldInitialize.subscribe((eventData: WorldInitializeBeforeEvent) => {
  eventData.blockComponentRegistry.registerCustomComponent("ja:custom_log", {
    onPlayerInteract: (e: BlockComponentPlayerInteractEvent) => {
      const { block, player } = e;
      
      if (!player) return;

      const inventory = player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent;
      const mainHandItem = inventory?.container?.getItem(player.selectedSlotIndex);
      if (!mainHandItem?.hasTag("minecraft:is_axe")) return;

      const face = block.permutation.getState("minecraft:block_face");
      if (face) {
        const id = block.typeId.includes("wood") ? "ja:pale_oak_stripped_wood" : "ja:pale_oak_stripped_log";
        const strippedLog = BlockPermutation.resolve(id, {
          "minecraft:block_face": face
        })

        block.setPermutation(strippedLog);
      }

      damage_item(player, player.selectedSlotIndex);
      player.playSound("step.wood");
    }
  });

  eventData.blockComponentRegistry.registerCustomComponent("ja:custom_slab", {
    onPlayerInteract: (e: BlockComponentPlayerInteractEvent) => {
      const { block, player, face } = e;

      if (!player) return;
      
      const inventory = player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent;
      const mainHandItem = inventory?.container?.getItem(player.selectedSlotIndex);
      if (mainHandItem?.typeId !== "ja:pale_oak_slab") return;

      const half = block.permutation.getState("minecraft:vertical_half");

      const isBottom = half === "bottom" && face === Direction.Up;
      const isUpper = half === "top" && face === Direction.Down;

      if (isBottom || isUpper) {
        block.setPermutation(block.permutation.withState("ja:double_slab", true));

        if (player.getGameMode() !== "creative") {
          mainHandItem.amount -= 1;
          if (mainHandItem.amount === 0) {
            inventory?.container?.setItem(player.selectedSlotIndex, undefined);
          } else {
            inventory?.container?.setItem(player.selectedSlotIndex, mainHandItem);
          }
        }

        player.playSound("use.wood");
      }
    }
  })
});