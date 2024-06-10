import 'frida-il2cpp-bridge';

let AssemblyCSharp: Il2Cpp.Assembly;
let rigged_number: UInt64 = uint64(0);

function create_response(msg: string): Il2Cpp.Object {
  const SocialChatMsg = AssemblyCSharp.image.class("SocialChatMsg");

  let response = SocialChatMsg.new();
  response.method(".ctor").invoke();
  response.field("type").value = 3;
  response.field("cell_height").value = 1.0;
  response.field("name").value = Il2Cpp.string("");
  response.field("message").value = Il2Cpp.string(msg);
  response.field("is_cell_height_updated").value = false;
  return response;
}

function set_bankroll(value: UInt64) {
  const CasinoPrefsData = AssemblyCSharp.image.class("CasinoPrefsData");
  CasinoPrefsData.method("saveTotalCoinsOnServer").invoke(value);
}

function set_level(level: UInt64, status: UInt64) {
  const AppEconomyManager = AssemblyCSharp.image.class("AppEconomyManager");
  let snapshot = Il2Cpp.MemorySnapshot.capture();

  snapshot.objects.filter(Il2Cpp.isExactly(AppEconomyManager)).forEach((instance: Il2Cpp.Object) => {
    instance.method("setUserLevelOnLogin").invoke(level, status);
  });

  snapshot.free();
}

function send_gift(id: string) {
  const Action = Il2Cpp.corlib.class("System.Action`1");
  const SocialMiscResponse = AssemblyCSharp.image.class("SocialMiscResponse");
  const CasinoConfigManager = AssemblyCSharp.image.class("CasinoConfigManager");

  const gift = CasinoConfigManager.method("SocialGiftCoins");
  const fake_action = Il2Cpp.delegate(Action.inflate(SocialMiscResponse), () => { });
  gift.invoke(Il2Cpp.string(id), Il2Cpp.string("Send"), Il2Cpp.string("Single"), fake_action);
}

async function main() {
  AssemblyCSharp = Il2Cpp.domain.assembly('Assembly-CSharp');

  const CasinoHelper = AssemblyCSharp.image.class("CasinoHelper");
  const RouletteManager = AssemblyCSharp.image.class("RouletteManager");
  const SocialRoomChatManager = AssemblyCSharp.image.class("SocialRoomChatManager");

  CasinoHelper.method("systemErrorAlert").implementation = function () {
    return false;
  }

  RouletteManager.method("evaluateResult").implementation = function (this) {
    this.field("_hittedNumber").value = rigged_number;
    return this.method("evaluateResult").invoke();
  }

  SocialRoomChatManager.method("SendChatMessages").implementation = function (this, chatMsg) {
    const content = ((chatMsg as Il2Cpp.Object).field("message").value as Il2Cpp.String).content;
    const args = content?.split(" ");

    switch (args![0]) {
      case "setlvl":
        set_level(uint64(args![1]), uint64(args![2]));
        this.method("AddChatMessage").invoke(create_response("Level updated - go home to update"));
        break;

      case "donate":
        send_gift(args![1]);
        this.method("AddChatMessage").invoke(create_response("Sent user provided a gift"));
        break;

      case "setmoney":
        set_bankroll(uint64(args![1]));
        this.method("AddChatMessage").invoke(create_response("Restart game for bankroll to update"));
        break;

      case "rouletterig":
        rigged_number = uint64(args![1]);
        this.method("AddChatMessage").invoke(create_response("Roulette will now always land on " + args![1]));
        break;

      case "send":
        (chatMsg as Il2Cpp.Object).field("type").value = parseInt(args![1]);
        ((chatMsg as Il2Cpp.Object).field("message").value as Il2Cpp.String).content = args!.slice(2).join(" ");
        this.method("SendChatMessages").invoke(chatMsg);
        break;

      default:
        return this.method("SendChatMessages").invoke(chatMsg);
    }
  }
}

Il2Cpp.perform(main);
